const PROMPTS = [
  'Проверить правоспособность контрагента для выдачи кредита',
  'Какие требования к уставному капиталу ООО?',
  'Найти положения о персональных данных в договоре',
  'Какие основания для расторжения кредитного договора?',
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">⚖</div>
      <h2>Чем помочь?</h2>
      <p>
        Задайте вопрос по базе знаний. Ассистент ответит строго по документам
        и укажет источники — проверяйте ссылки.
      </p>
      <div className="prompt-grid">
        {PROMPTS.map((p) => (
          <button
            key={p}
            className="prompt-card"
            onClick={() => onPick(p)}
            type="button"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
