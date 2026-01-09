# 🔍 게임 중인 플레이어 포함 팀의 게임 시작 버튼 이슈 디버깅

## 📋 문제 설명

### 재현 단계:
1. ABCD가 게임 중 (A, B, C, D는 `playing` 상태)
2. AB와 EF로 수동 팀 생성
3. **새로고침 전**: 일괄 게임 시작 & 개별 게임 시작 버튼 작동 안함 ✅
4. **새로고침 후**: 버튼이 활성화되어 게임이 시작됨 ❌

### 예상 동작:
- 게임 중인 플레이어(A, B)가 포함된 팀은 **버튼이 비활성화**되어야 함
- 새로고침 전후 동일한 동작

---

## ✅ 현재 방어 메커니즘

### 1️⃣ **TeamCard 컴포넌트** (`/components/TeamCard.tsx`)
```typescript
// Line 25-26: 게임 중인 플레이어 체크
const hasPlayingPlayer = teamPlayers.some(p => p.state === 'playing');

// Line 52: 버튼 비활성화
disabled={availableCourtCount === 0 || hasPlayingPlayer}
```

✅ **예상 동작**: `hasPlayingPlayer`가 `true`면 버튼 비활성화

### 2️⃣ **startGame 함수** (`/hooks/useGameState.ts`)
```typescript
// Line 604-618: 중복 플레이어 검증
const playingPlayers = team.playerIds.filter(playerId => {
  const player = prev.players.find(p => p.id === playerId);
  return player && player.state === 'playing';
});

if (playingPlayers.length > 0) {
  console.log(`⚠️ Cannot start: ${playingPlayers.length} player(s) already playing`);
  return prev; // NO STATE CHANGE
}
```

✅ **백엔드 검증**: playing 플레이어가 있으면 게임 시작 차단

### 3️⃣ **startAllQueuedGames 함수** (`/hooks/useGameState.ts`)
```typescript
// Line 734-746: 중복 플레이어 팀 필터링
const queuedTeams = allQueuedTeams.filter(team => {
  const hasPlayingPlayer = team.playerIds.some(playerId => {
    const player = prev.players.find(p => p.id === playerId);
    return player && player.state === 'playing';
  });
  
  if (hasPlayingPlayer) {
    console.log(`⚠️ Skipping team ${team.id}: contains playing player(s)`);
  }
  
  return !hasPlayingPlayer;
});
```

✅ **일괄 시작 시 필터링**: playing 플레이어 포함 팀 건너뜀

---

## 🔧 추가된 디버깅

### TeamCard에 로깅 추가:
```typescript
console.log(`🎯 TeamCard [${team.name}]:`, {
  teamId: team.id,
  teamState: team.state,
  playerIds: team.playerIds,
  teamPlayers: teamPlayers.map(p => ({ id: p.id, name: p.name, state: p.state })),
  hasPlayingPlayer,
  buttonDisabled: availableCourtCount === 0 || hasPlayingPlayer
});
```

---

## 🧪 테스트 체크리스트

### 새로고침 후 확인사항:

1. **콘솔에서 TeamCard 로그 확인**
   - [ ] `teamPlayers`에 A, B의 `state`가 `playing`으로 표시됨
   - [ ] `hasPlayingPlayer`가 `true`로 표시됨
   - [ ] `buttonDisabled`가 `true`로 표시됨

2. **실제 버튼 상태 확인**
   - [ ] 버튼이 시각적으로 비활성화됨 (opacity 50%, cursor not-allowed)
   - [ ] 버튼 클릭 시 아무 동작 없음

3. **startGame 함수 로그 확인**
   - 만약 버튼이 활성화되어 클릭 가능하다면:
   - [ ] `⚠️ Cannot start: X player(s) already playing` 메시지 출력
   - [ ] 게임이 실제로 시작되지 않음

---

## 🎯 예상 결과

### 시나리오 A: **UI 버튼이 제대로 비활성화됨** ✅
- `hasPlayingPlayer = true`
- 버튼 disabled 상태
- 문제 없음

### 시나리오 B: **UI 버튼이 활성화되지만 startGame이 차단함** ⚠️
- `hasPlayingPlayer = false` (로컬 상태 불일치)
- 버튼 활성화
- 클릭 시 `startGame`이 백엔드 검증으로 차단
- **문제**: 플레이어 상태 로딩 오류

### 시나리오 C: **게임이 실제로 시작됨** ❌
- 모든 방어선 우회
- **치명적 버그**

---

## 🔍 다음 단계

1. **재현 후 콘솔 로그 확인**
   - TeamCard의 `hasPlayingPlayer` 값
   - 플레이어들의 실제 `state` 값

2. **시나리오 확인**
   - 시나리오 A: 문제 없음 (사용자 착각)
   - 시나리오 B: 데이터 로딩 최적화 필요
   - 시나리오 C: 긴급 버그 수정 필요

3. **추가 수정 (필요 시)**
   - 시나리오 B 발생 시: `syncFromSupabase` 최적화
   - 시나리오 C 발생 시: 방어 로직 강화

---

## 📝 변경 사항 요약

### ✅ 복원된 기능:
- ✅ 게임 중인 플레이어를 수동 팀에 선택 가능 (원래 요구사항)
- ✅ UI에서 선택 차단 해제

### ✅ 유지된 방어:
- ✅ TeamCard: `hasPlayingPlayer` 체크로 버튼 비활성화
- ✅ startGame: 백엔드 검증으로 중복 플레이어 차단
- ✅ startAllQueuedGames: 중복 플레이어 팀 자동 건너뜀

### ➕ 추가된 디버깅:
- ➕ TeamCard에 상세 로그 추가
- ➕ 이 문서 작성
