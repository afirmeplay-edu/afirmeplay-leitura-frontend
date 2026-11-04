const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value?: string | null): boolean {
  return Boolean(value?.trim() && UUID_RE.test(value.trim()));
}

export interface IcaSkillDisplay {
  code: string;
  label: string;
  uncatalogued: boolean;
}

/** Normaliza código/rótulo vindos do skill-map ou de itens do aluno. */
export function formatIcaSkillDisplay(
  skillCode?: string | null,
  skillLabel?: string | null
): IcaSkillDisplay | null {
  const code = skillCode?.trim() || "";
  const label = skillLabel?.trim() || "";
  if (!code && !label) return null;

  const codeIsUuid = looksLikeUuid(code);
  const labelIsUuid = looksLikeUuid(label);
  const same = code && label && code === label;

  if ((codeIsUuid && (!label || same || labelIsUuid)) || (!code && labelIsUuid)) {
    return {
      code: code || label,
      label: "Habilidade não catalogada",
      uncatalogued: true,
    };
  }

  return {
    code: code || "—",
    label: label && !same ? label : label || code,
    uncatalogued: false,
  };
}
