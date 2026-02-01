export class QuizOptionDto {
  id: number;
  quizId: number;
  text: string;
  order: number;
}

export class QuizDto {
  id: number;
  sourceType: string;
  sourceId: number;
  type: string;
  questionEnglish: string;
  questionKorean?: string;
  answerIndex: number;
  description?: string;
  order?: number;
  isActive: boolean;
  options: QuizOptionDto[];
}
