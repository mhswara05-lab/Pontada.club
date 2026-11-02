// Display legacy club names consistently without rewriting scores, queues or archives.
export function tournamentDisplayName(name:string):string {
  return name.replace(/\bpontada\b/gi,'Salonsa');
}
