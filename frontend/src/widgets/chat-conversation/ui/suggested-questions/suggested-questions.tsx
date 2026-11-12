import styles from "./suggested-questions.module.scss";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

const suggestedQuestions = [
  "У нас выросли счета за электричество",
  "Хочу наладить учёт электроэнергии",
  "Подозреваю потери электроэнергии",
  "Хотим установить счётчики в СНТ",
];

export const SuggestedQuestions = ({ onSelect }: SuggestedQuestionsProps) => {
  return (
    <div aria-label="Готовые вопросы" className={styles.suggestions}>
      {suggestedQuestions.map((question) => (
        <button
          key={question}
          className={styles.question}
          onClick={() => onSelect(question)}
          title={`Отправить: ${question}`}
          type="button"
        >
          {question}
        </button>
      ))}
    </div>
  );
};
