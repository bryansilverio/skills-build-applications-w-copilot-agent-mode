import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = {
  _id?: string;
  name: string;
  mascot?: string;
  members?: string[];
};

type TeamsResponse = { teams: Team[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getJson<TeamsResponse>('/api/teams')
      .then(({ teams: result }) => {
        if (active) setTeams(result);
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
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {loading ? (
          <p role="status">Loading teams...</p>
        ) : error ? (
          <p role="alert">Unable to load teams: {error}</p>
        ) : teams.length === 0 ? (
          <p>No teams yet.</p>
        ) : (
          <ul>
            {teams.map((team) => (
              <li key={team._id ?? team.name}>
                {team.name}
                {team.mascot ? ` (${team.mascot})` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
