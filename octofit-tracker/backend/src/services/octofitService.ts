import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function isObjectIdString(value: unknown): value is string {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
}

function focusForActivity(type: string) {
  switch (type.toLowerCase()) {
    case 'run':
    case 'cycle':
      return 'endurance';
    case 'strength':
      return 'strength';
    default:
      return undefined;
  }
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) {
    throw httpError('Activity data must be an object', 400);
  }

  const { userId, teamId, type, minutes } = input;
  if (
    typeof userId !== 'string' ||
    !Types.ObjectId.isValid(userId) ||
    typeof teamId !== 'string' ||
    !Types.ObjectId.isValid(teamId) ||
    typeof type !== 'string' ||
    type.trim().length === 0 ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw httpError('Activity requires valid userId, teamId, type, and minutes', 400);
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) {
    throw httpError('Activity user or team was not found', 404);
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) {
    throw httpError('Team data must be an object', 400);
  }

  const { name, mascot } = input;
  const members = input.members === undefined ? [] : input.members;
  if (
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    typeof mascot !== 'string' ||
    mascot.trim().length === 0 ||
    !Array.isArray(members) ||
    !members.every(isObjectIdString)
  ) {
    throw httpError('Team requires a name, mascot, and valid member IDs', 400);
  }

  const memberIds = [...new Set(members)];
  const memberCount = await User.countDocuments({ _id: { $in: memberIds } });
  if (memberCount !== memberIds.length) {
    throw httpError('One or more team members were not found', 404);
  }

  return Team.create({ name, mascot, members: memberIds });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate<{ teamName: string; totalPoints: number }>([
    {
      $lookup: {
        from: Activity.collection.name,
        let: { teamId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$team', '$$teamId'] } } },
          { $group: { _id: null, totalPoints: { $sum: '$points' } } },
        ],
        as: 'activityTotals',
      },
    },
    {
      $project: {
        _id: 0,
        teamName: '$name',
        totalPoints: { $ifNull: [{ $arrayElemAt: ['$activityTotals.totalPoints', 0] }, 0] },
      },
    },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);
  return teams.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw httpError('User was not found', 404);
  }

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  let focus = recentActivity ? focusForActivity(recentActivity.type) : undefined;
  let reason = focus
    ? `Your recent ${recentActivity?.type} activity suggests a ${focus} workout.`
    : `This workout matches your ${user.fitnessGoal} fitness goal.`;
  if (!focus) focus = user.fitnessGoal;

  let workouts = await Workout.find({ focus }).lean();
  if (workouts.length === 0 && focus !== user.fitnessGoal) {
    focus = user.fitnessGoal;
    reason = `This workout matches your ${user.fitnessGoal} fitness goal.`;
    workouts = await Workout.find({ focus }).lean();
  }

  return workouts.map((workout) => ({ ...workout, reason }));
}

export { User };
