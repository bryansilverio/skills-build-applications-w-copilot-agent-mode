import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = {
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

type WorkoutsResponse = { suggestions: WorkoutSuggestion[] };

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const userEmail = encodeURIComponent('mona@example.com');
    void getJson<WorkoutsResponse>(`/api/workouts/suggestions/${userEmail}`)
      .then(({ suggestions: result }) => {
        if (active) setSuggestions(result);
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
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {loading ? (
          <p role="status">Loading workout suggestions...</p>
        ) : error ? (
          <p role="alert">Unable to load workout suggestions: {error}</p>
        ) : suggestions.length === 0 ? (
          <p>No workout suggestions yet.</p>
        ) : (
          <ul>
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion.title}-${index}`}>
                <strong>{suggestion.title}</strong>
                {suggestion.focus ? ` - ${suggestion.focus}` : ''}
                {suggestion.reason ? `: ${suggestion.reason}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
