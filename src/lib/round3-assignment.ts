type ProblemIdentity = { id: string; order: number };

function hashParticipantId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shuffleForParticipant<T>(items: T[], participantId: string) {
  const shuffled = [...items];
  let seed = hashParticipantId(participantId);

  for (let index = shuffled.length - 1; index > 0; index--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function assignCodingProblem<T extends ProblemIdentity>(problems: T[], participantId: string) {
  if (problems.length === 0) return null;

  const ordered = [...problems].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return ordered[hashParticipantId(participantId) % ordered.length];
}
