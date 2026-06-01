export function generatePatterns(firstName, lastName, domain) {
  const f = firstName.toLowerCase().trim();
  const l = lastName.toLowerCase().trim();
  const fi = f[0];
  const li = l[0];

  const patterns = [
    `${f}.${l}`,
    `${f}${l}`,
    `${f}_${l}`,
    `${fi}${l}`,
    `${fi}.${l}`,
    `${f}${li}`,
    `${f}.${li}`,
    `${f}`,
    `${l}`,
    `${l}.${f}`,
    `${l}${f}`,
    `${l}_${f}`,
    `${l}${fi}`,
    `${l}.${fi}`,
    `${fi}${li}`,
  ];

  const unique = [...new Set(patterns)];
  return unique.map((p) => `${p}@${domain}`);
}
