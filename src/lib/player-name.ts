export type PlayerNameInput = {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
};

export function formatPlayerName(player: PlayerNameInput) {
  const firstName = player.firstName?.trim();
  const lastInitial = player.lastName?.trim().charAt(0).toUpperCase();

  if (firstName && lastInitial) {
    return `${firstName} ${lastInitial}.`;
  }

  if (firstName) {
    return firstName;
  }

  return player.name;
}
