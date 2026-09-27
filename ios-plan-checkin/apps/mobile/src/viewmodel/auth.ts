export const phonePattern = /^1[3-9][0-9]{9}$/;

export function normalizePhone(input: string): string {
  return input.replace(/\s/g, "");
}

export function maskPhone(phone: string): string {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function validUsername(input: string): boolean {
  const value = input.normalize("NFKC").trim();
  return (
    [...value].length >= 3 &&
    [...value].length <= 30 &&
    /^[\p{L}\p{N}_]+$/u.test(value)
  );
}

export function validNickname(input: string): boolean {
  const length = [...input.normalize("NFKC").trim()].length;
  return length >= 1 && length <= 20;
}

export function remainingSeconds(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
