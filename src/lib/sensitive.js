const SENSITIVE = ['password','token','secret','authorization','cookie','session','otp','credit card','national id'];
export function findSensitiveColumns(columns = []) {
  return columns.filter(c => SENSITIVE.some(k => c.toLowerCase().includes(k)));
}
