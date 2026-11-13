import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Activity = {
  _id?: string;
  type: string;
  minutes: number;
  points: number;
  occurredAt?: string;
};

type ActivitiesResponse = { activities: Activity[] };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getJson<ActivitiesResponse>('/api/activities')
      .then(({ activities: result }) => {
        if (active) setActivities(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unknown error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Activities</h2>
        <p>Track student activity minutes and points.</p>
        {loading ? (
          <p role="status">Loading activities...</p>
        ) : error ? (
          <p role="alert">Unable to load activities: {error}</p>
        ) : activities.length === 0 ? (
          <p>No activities yet.</p>
        ) : (
          <ul>
            {activities.map((activity, index) => (
              <li key={activity._id ?? `${activity.type}-${activity.occurredAt ?? index}`}>
                {activity.type}: {activity.minutes} minutes, {activity.points} points
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
