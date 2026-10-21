const MESSAGES = {
  en: {
    usage: `Usage: npx @virastack/ai <command> [options]

Commands:
  init      Install or update ViraStack AI rules
  remove    Remove ViraStack AI rules and blocks

Options:
  --agent <list>      claude, cursor, or none (comma separated). Default: claude,cursor
  --framework <name>  nextjs or tanstack. Overrides detection
  -f, --force         Also overwrite or delete managed files you changed
  --dry-run           Show the plan without writing anything
  -y, --yes           Answer every question with its default
  --tr                Turkish output
  -h, --help          Show this help
  -v, --version       Show the version`,
    title: (version) => `ViraStack AI v${version}`,
    context: (fw, agents, i18n, pm) =>
      `Framework: ${fw} · Agents: ${agents} · i18n: ${i18n ? "yes" : "no"} · Package manager: ${pm}`,
    none: "none (AGENTS.md)",
    dryRun: "Dry run: nothing was written.",
    created: "created",
    updated: "updated",
    removed: "removed",
    skipped: "skipped",
    unchanged: "unchanged",
    kept: "kept",
    reasonModified: "you changed this file",
    reasonUnknown: "file exists and is not managed by ViraStack AI",
    reasonLegacyModified: "v1 file you changed; delete it yourself if no longer needed",
    reasonNoTty: "not an interactive terminal; use --force to overwrite",
    legacyAgentsMd:
      "AGENTS.md has v1 content you edited. It was kept and the new block was added below it; remove the old part to avoid duplicate instructions.",
    conflictList: "These files differ from what ViraStack AI installed:",
    confirmOverwrite: "Overwrite them? [y/N] ",
    confirmDelete: "Delete them anyway? [y/N] ",
    summary: (c, u, r, s) => `${c} created · ${u} updated · ${r} removed · ${s} skipped`,
    doneInit: "ViraStack AI rules are ready.",
    doneRemove: "ViraStack AI was removed.",
    nothingToRemove: "Nothing to remove: no ViraStack AI install found.",
    noChanges: "Already up to date.",
    unknownFramework: "Could not detect the framework. Use --framework nextjs or --framework tanstack.",
    failed: "ViraStack AI failed:",
    errors: {
      badOption: (message) => message,
      missingCommand: () => "Missing command.",
      unknownCommand: (command) => `Unknown command: ${command}`,
      unexpectedArgument: (arg) => `Unexpected argument: ${arg}`,
      invalidAgent: (agent) => `Unknown agent: ${agent}. Use claude, cursor, or none.`,
      noneCombined: () => "--agent none cannot be combined with other agents.",
      invalidFramework: (fw) => `Unknown framework: ${fw}. Use nextjs or tanstack.`,
    },
  },
  tr: {
    usage: `Kullanım: npx @virastack/ai <komut> [seçenekler]

Komutlar:
  init      ViraStack AI kurallarını kurar veya günceller
  remove    ViraStack AI kurallarını ve bloklarını kaldırır

Seçenekler:
  --agent <liste>     claude, cursor veya none (virgülle). Varsayılan: claude,cursor
  --framework <ad>    nextjs veya tanstack. Tespiti ezer
  -f, --force         Değiştirdiğin yönetilen dosyaları da ezer veya siler
  --dry-run           Hiçbir şey yazmadan planı gösterir
  -y, --yes           Tüm sorulara varsayılan yanıtı verir
  --tr                Türkçe çıktı
  -h, --help          Bu yardımı gösterir
  -v, --version       Sürümü gösterir`,
    title: (version) => `ViraStack AI v${version}`,
    context: (fw, agents, i18n, pm) =>
      `Framework: ${fw} · Araçlar: ${agents} · i18n: ${i18n ? "var" : "yok"} · Paket yöneticisi: ${pm}`,
    none: "yok (AGENTS.md)",
    dryRun: "Deneme çalıştırması: hiçbir şey yazılmadı.",
    created: "oluşturuldu",
    updated: "güncellendi",
    removed: "silindi",
    skipped: "atlandı",
    unchanged: "aynı",
    kept: "korundu",
    reasonModified: "bu dosyayı değiştirmişsin",
    reasonUnknown: "dosya var ve ViraStack AI'a ait değil",
    reasonLegacyModified: "değiştirdiğin v1 dosyası; gerekmiyorsa kendin sil",
    reasonNoTty: "etkileşimli terminal değil; ezmek için --force kullan",
    legacyAgentsMd:
      "AGENTS.md içinde düzenlediğin v1 içeriği var. Korundu ve yeni blok altına eklendi; tekrar eden talimat olmaması için eski kısmı sil.",
    conflictList: "Bu dosyalar ViraStack AI'ın kurduğu halden farklı:",
    confirmOverwrite: "Üzerine yazılsın mı? [e/H] ",
    confirmDelete: "Yine de silinsin mi? [e/H] ",
    summary: (c, u, r, s) => `${c} oluşturuldu · ${u} güncellendi · ${r} silindi · ${s} atlandı`,
    doneInit: "ViraStack AI kuralları hazır.",
    doneRemove: "ViraStack AI kaldırıldı.",
    nothingToRemove: "Kaldırılacak bir şey yok: ViraStack AI kurulumu bulunamadı.",
    noChanges: "Zaten güncel.",
    unknownFramework: "Framework tespit edilemedi. --framework nextjs veya --framework tanstack kullan.",
    failed: "ViraStack AI başarısız oldu:",
    errors: {
      badOption: (message) => message,
      missingCommand: () => "Komut eksik.",
      unknownCommand: (command) => `Bilinmeyen komut: ${command}`,
      unexpectedArgument: (arg) => `Beklenmeyen argüman: ${arg}`,
      invalidAgent: (agent) => `Bilinmeyen araç: ${agent}. claude, cursor veya none kullan.`,
      noneCombined: () => "--agent none başka araçlarla birlikte verilemez.",
      invalidFramework: (fw) => `Bilinmeyen framework: ${fw}. nextjs veya tanstack kullan.`,
    },
  },
};

export function createMessages(tr) {
  return tr ? MESSAGES.tr : MESSAGES.en;
}

export function isYes(answer) {
  return ["y", "yes", "e", "evet"].includes(answer.trim().toLowerCase());
}
