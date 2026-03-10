# PromptTemplate DB 시드용 프롬프트 텍스트

각 `.txt` 파일의 내용을 `PromptTemplate` 테이블에 INSERT할 때 `content` 컬럼에 넣으면 됩니다.

## key 매핑

| 파일명 | key | type |
|--------|-----|------|
| generate_dialogues.txt | AI_SLOT_GENERATE_DIALOGUES | AI_SLOT |
| correct_and_dialogues.txt | AI_INPUT_SLOT_CORRECT_AND_DIALOGUES | AI_INPUT_SLOT |
| evaluate_slots.txt | AI_INPUT_SLOT_EVALUATE | EVALUATION |
| pick_sentences_for_quiz.txt | AI_INPUT_SLOT_PICK_DIALOGUES_FOR_QUIZ | QUIZ |
| chat.txt | CHAT | CHAT |

## 변수 ({{placeholder}})

### generate_dialogues
- `userCharacterLine` - User: id=..., name="...", personality="..."
- `npcList` - NPC 목록 (줄바꿈으로 구분)
- `situation` - 상황 설명
- `constraints` - Constraints:\n... (없으면 빈 문자열)
- `dataTable` - JSON.stringify된 dataTable

### correct_and_dialogues
- `userCharacterLine` - User: id=..., name="..."
- `npcList` - NPC 목록
- `situation` - 상황
- `constraints` - Constraints:\n... (없으면 빈 문자열)
- `sceneMessages` - Previous messages:\n... (없으면 빈 문자열)
- `userText` - 유저 입력 텍스트
- `dataTablePrompt` - DataTable:\n... (없으면 빈 문자열)
- `userCharacterId` - 유저 캐릭터 ID (숫자)
- `userCharacterName` - 유저 캐릭터 이름

### evaluate_slots
- `turnList` - Turn 1: original="..." → corrected="..." 형식의 줄바꿈 구분 문자열

### pick_sentences_for_quiz
- `sentencesList` - "- 문장1\n- 문장2" 형식의 문자열

### chat
- `aiPrompt` - 캐릭터 AI 지시문
- `affinity` - 친밀도 (0-100)
- `userNameLine` - 유저 이름 관련 문장 (이름 있음/없음)
- `payloadFields` - payload에 포함할 필드 (translated, corrected 등, 없으면 빈 문자열)
