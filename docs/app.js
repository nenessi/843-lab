const progressBar = document.querySelector("#progressBar");
const supplyChecks = document.querySelector("#supplyChecks");
const supplyResult = document.querySelector("#supplyResult");
const supplyCheckButton = document.querySelector("#supplyCheckButton");
const supplyPackButton = document.querySelector("#supplyPackButton");
const supplyOkayButton = document.querySelector("#supplyOkayButton");
const stateButtons = document.querySelector("#stateButtons");
const selectedState = document.querySelector("#selectedState");
const positionPanel = document.querySelector("#positionPanel");
const cardResults = document.querySelector("#cardResults");
const signalPanel = document.querySelector("#signalPanel");
const classButtons = document.querySelector("#classButtons");
const classEmptyNote = document.querySelector("#classEmptyNote");
const mileagePanel = document.querySelector("#mileagePanel");
const recommendedPacks = document.querySelector("#recommendedPacks");
const packDetail = document.querySelector("#packDetail");
const finalAction = document.querySelector("#finalAction");
const DATA_BASE = window.location.pathname.includes("/prototype/") ? "../data" : "./data";

const supplyItems = [
  "잠을 잘 못 자서 피곤하다",
  "식사를 건너뛰었거나 물을 거의 못 마셨다",
  "몸이 아프거나 뻐근하다",
  "소리, 빛, 화면, 주변 분위기가 버겁다",
  "약이나 영양제, 매일 하던 작은 루틴을 놓쳤다",
  "마음 쓰는 일이 많아서 힘이 빠졌다"
];

const packNameById = {
  "recovery-mini-pack": "자원 회복 미니팩",
  "restart-pack": "재점화팩",
  "stop-pack": "멈춤팩",
  "anxiety-buffer-pack": "불안 완충팩",
  "relationship-armor-pack": "관계 방어구팩",
  "standard-pack": "기준 세우기팩",
  "reality-link-pack": "현실 연결팩",
  "variation-sustain-pack": "변주 지속팩"
};

const cardPackMap = {
  "tanker-shield": ["관계 방어구팩", "자원 회복 미니팩"],
  "tanker-absorb": ["멈춤팩", "자원 회복 미니팩"],
  "tanker-guide": ["관계 방어구팩", "기준 세우기팩"],
  "healer-self": ["자원 회복 미니팩", "재점화팩"],
  "healer-other": ["관계 방어구팩", "자원 회복 미니팩"],
  "healer-stabilize": ["자원 회복 미니팩", "불안 완충팩"],
  "supporter-signal": ["불안 완충팩", "기준 세우기팩"],
  "supporter-align": ["기준 세우기팩", "재점화팩"],
  "supporter-direction": ["기준 세우기팩", "현실 연결팩"],
  "dealer-burst": ["멈춤팩", "자원 회복 미니팩"],
  "dealer-sustain": ["변주 지속팩", "재점화팩"],
  "dealer-switch": ["재점화팩", "불안 완충팩"]
};

let cardsById = new Map();
let states = [];
let classes = [];
let packsById = new Map();
let packsByName = new Map();
let packCardsByPackId = new Map();
let currentStep = 0;
let selectedStateData = null;
let recommendedCards = [];
let selectedCard = null;
let selectedClass = null;
let selectedPack = null;
let supplyLow = false;
let externalEntryNotice = null;

async function loadPrototypeData() {
  const [
    cardsResponse,
    routerResponse,
    classesResponse,
    packsResponse,
    packCardsResponse
  ] = await Promise.all([
    fetch(`${DATA_BASE}/cards.json`),
    fetch(`${DATA_BASE}/router.json`),
    fetch(`${DATA_BASE}/classes.json`),
    fetch(`${DATA_BASE}/packs.json`),
    fetch(`${DATA_BASE}/pack-cards.json`)
  ]);

  if (
    !cardsResponse.ok ||
    !routerResponse.ok ||
    !classesResponse.ok ||
    !packsResponse.ok ||
    !packCardsResponse.ok
  ) {
    throw new Error("프로토타입 데이터를 불러오지 못했습니다.");
  }

  const cards = await cardsResponse.json();
  const router = await routerResponse.json();
  const packs = await packsResponse.json();
  const packCards = await packCardsResponse.json();

  cardsById = new Map(cards.map((card) => [card.id, card]));
  states = router.states;
  classes = await classesResponse.json();
  packsById = new Map(packs.map((pack) => [pack.id, pack]));
  packsByName = new Map(packs.map((pack) => [pack.packName, pack]));
  packCardsByPackId = packCards.reduce((groups, card) => {
    const current = groups.get(card.packId) || [];
    current.push(card);
    groups.set(card.packId, current);
    return groups;
  }, new Map());
}

function goToStep(step) {
  currentStep = step;

  document.querySelectorAll(".stage").forEach((stage) => {
    stage.classList.toggle("is-active", Number(stage.dataset.stage) === step);
    stage.classList.toggle("is-past", Number(stage.dataset.stage) < step);
  });

  progressBar.querySelectorAll("button").forEach((button) => {
    const buttonStep = Number(button.dataset.step);
    button.classList.toggle("is-active", buttonStep === step);
    button.classList.toggle("is-done", buttonStep < step);
  });

  if (step === 6) {
    renderRecommendedPacks();
  }

  document.querySelector(`.stage[data-stage="${step}"]`)?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function getExternalParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    cardId: params.get("card"),
    packId: params.get("pack"),
    classId: params.get("class")
  };
}

function showExternalEntryNotice(message) {
  if (!externalEntryNotice) {
    externalEntryNotice = document.createElement("div");
    externalEntryNotice.className = "stage-result";
    document.querySelector(".hero")?.append(externalEntryNotice);
  }

  externalEntryNotice.textContent = message;
}

function hideExternalEntryNotice() {
  if (externalEntryNotice) {
    externalEntryNotice.remove();
    externalEntryNotice = null;
  }
}

function showMissingExternalItem() {
  showExternalEntryNotice("해당 항목을 찾을 수 없어요. 주소가 맞는지 확인하거나, 목록에서 다시 골라 주세요.");
}

function selectClassById(classId) {
  if (!classId) {
    return null;
  }

  selectedClass = classes.find((profile) => profile.id === classId) || null;

  document.querySelectorAll(".class-chip").forEach((item) => {
    item.classList.toggle("is-selected", item.dataset.classId === classId);
  });

  return selectedClass;
}

function getClassDisplayLabel(profile) {
  return profile.displayLabel || profile.className;
}

function getClassDisplayDescription(profile) {
  return profile.displayDescription || profile.oneLine;
}

function renderClassProfileOnly() {
  if (!selectedClass) {
    return;
  }

  classEmptyNote.hidden = true;
  mileagePanel.innerHTML = `
    <article class="mileage-card neutral">
      <span class="panel-label">내 평소 방식</span>
      <h3>${getClassDisplayLabel(selectedClass)}</h3>
      <p>${getClassDisplayDescription(selectedClass)}</p>
      <div class="profile-detail">
        <strong>먼저 보는 부분</strong>
        <p>${selectedClass.mainLens}</p>
      </div>
      <div class="profile-detail">
        <strong>주의 신호</strong>
        <p>${selectedClass.cautionSignals.join(" / ")}</p>
      </div>
      <p>같이 보면 좋은 팩은 <strong>${selectedClass.recommendedPacks[0]}</strong>입니다.</p>
    </article>
  `;
  renderRecommendedPacks();
}

function openCardFromExternalLink(cardId) {
  const card = cardsById.get(cardId);

  if (!card) {
    showMissingExternalItem();
    return false;
  }

  selectedStateData = {
    id: "external-card",
    label: `${card.cardName} 카드`
  };
  recommendedCards = [card];
  selectedCard = card;
  selectedPack = null;

  document
    .querySelectorAll(".state-button")
    .forEach((item) => item.classList.remove("is-selected"));

  renderOperationCards();
  renderSignalPanel();
  renderMileagePanel();
  renderRecommendedPacks();
  goToStep(4);
  return true;
}

function openPackFromExternalLink(packId) {
  const pack = packsById.get(packId);

  if (!pack) {
    showMissingExternalItem();
    return false;
  }

  goToStep(6);
  recommendedPacks.innerHTML = `
    <span class="panel-label">공유된 팩</span>
    <div class="pack-button-list">
      <button class="pack-equip-button is-selected" type="button" data-pack-name="${pack.packName}">
        <strong>${getPackDisplayName(pack)}</strong>
        ${getPackDescription(pack) ? `<small>${getPackDescription(pack)}</small>` : ""}
        <span>열림</span>
      </button>
    </div>
  `;
  renderPackDetail(pack.packName);
  return true;
}

function openClassFromExternalLink(classId) {
  if (!selectClassById(classId)) {
    showMissingExternalItem();
    return false;
  }

  renderClassProfileOnly();
  goToStep(5);
  return true;
}

function handleExternalEntry() {
  const { cardId, packId, classId } = getExternalParams();

  if (!cardId && !packId && !classId) {
    return;
  }

  if (classId) {
    selectClassById(classId);
  }

  if (cardId) {
    if (!openCardFromExternalLink(cardId)) {
      showMissingExternalItem();
      return;
    }
    showExternalEntryNotice("공유된 항목을 열었어요. 아래 내용을 보고 나와 가까운 부분이 있는지 확인해 보세요.");
    return;
  }

  if (packId) {
    if (!openPackFromExternalLink(packId)) {
      showMissingExternalItem();
      return;
    }
    showExternalEntryNotice("공유된 항목을 열었어요. 아래 내용을 보고 나와 가까운 부분이 있는지 확인해 보세요.");
    return;
  }

  if (classId) {
    if (!openClassFromExternalLink(classId)) {
      showMissingExternalItem();
      return;
    }
    showExternalEntryNotice("공유된 항목을 열었어요. 아래 내용을 보고 나와 가까운 부분이 있는지 확인해 보세요.");
    return;
  }
}

function renderSupplyChecks() {
  supplyChecks.innerHTML = supplyItems
    .map(
      (item, index) => `
        <label class="check-item">
          <input type="checkbox" value="${index}">
          <span>${item}</span>
        </label>
      `
    )
    .join("");
}

function clearSupplyOkaySelection() {
  supplyOkayButton.classList.remove("is-selected");
  supplyOkayButton.setAttribute("aria-pressed", "false");
}

function selectSupplyOkay() {
  supplyChecks.querySelectorAll("input").forEach((input) => {
    input.checked = false;
  });
  supplyOkayButton.classList.add("is-selected");
  supplyOkayButton.setAttribute("aria-pressed", "true");
  supplyLow = false;
  supplyPackButton.hidden = true;
  supplyResult.innerHTML = `
    <strong>기본 컨디션은 괜찮은 편으로 볼게요.</strong>
    <p>다음 단계에서 지금 막힌 상태에 가까운 문장을 골라 봅니다.</p>
  `;
  goToStep(2);
}

function handleSupplyInputChange(event) {
  if (event.target.matches("input[type='checkbox']")) {
    clearSupplyOkaySelection();
  }
}

function handleSupplyCheck() {
  const checkedCount = supplyChecks.querySelectorAll("input:checked").length;

  if (checkedCount === 0 && !supplyOkayButton.classList.contains("is-selected")) {
    supplyResult.innerHTML = `
      <strong>해당되는 항목이 없다면 아래 선택지를 눌러 주세요.</strong>
      <p>기본 컨디션이 괜찮은 편이면 다음 단계로 넘어가도 됩니다.</p>
    `;
    supplyPackButton.hidden = true;
    return;
  }

  supplyLow = checkedCount >= 2;

  if (supplyLow) {
    supplyResult.innerHTML = `
      <strong>컨디션이 먼저 무너져 있을 수 있어요.</strong>
      <p>여기에 여러 개가 해당된다면, 지금은 더 분석하기보다 먼저 쉬거나 먹고 마시는 쪽이 나을 수 있어요.</p>
    `;
    supplyPackButton.hidden = false;
    return;
  }

  supplyResult.innerHTML = `
    <strong>기본 컨디션은 크게 무너지지 않은 것 같아요.</strong>
    <p>다음 단계에서 지금 막힌 상태에 가까운 문장을 골라 봅니다.</p>
  `;
  supplyPackButton.hidden = true;
  goToStep(2);
}

function renderStateButtons() {
  stateButtons.innerHTML = states
    .map(
      (state) => `
        <button class="state-button" type="button" data-state-id="${state.id}">
          <span class="state-label">${state.label}</span>
          ${state.description ? `<span class="state-description">${state.description}</span>` : ""}
        </button>
      `
    )
    .join("");
}

function handleStateClick(event) {
  const button = event.target.closest(".state-button");

  if (!button) {
    return;
  }

  selectedStateData = states.find((state) => state.id === button.dataset.stateId);

  if (!selectedStateData) {
    return;
  }

  selectedCard = null;
  selectedPack = null;
  recommendedCards = selectedStateData.cards
    .map((cardId) => cardsById.get(cardId))
    .filter(Boolean);

  document
    .querySelectorAll(".state-button")
    .forEach((item) => item.classList.toggle("is-selected", item === button));

  renderOperationCards();
  goToStep(3);
}

function renderOperationCards() {
  const positions = [...new Set(recommendedCards.map((card) => card.position))];

  selectedState.textContent = `"${selectedStateData.label}"에 가까울 때 먼저 해볼 만한 후보입니다. 하나만 골라도 됩니다.`;
  positionPanel.innerHTML = `
    <span class="panel-label">지금 내 방식과 가까운 카드</span>
    <div class="position-list">
      ${positions.map((position) => `<span class="position-chip">${position}</span>`).join("")}
    </div>
  `;

  cardResults.innerHTML = recommendedCards
    .map(
      (card, index) => {
        const linkedPacks = getLinkedPackDisplayNames(card);

        return `
        <article class="card core-card">
          <span class="card-number">${index + 1}</span>
          <h3>${card.cardName}</h3>
          <p class="definition">${card.oneLine}</p>
          <div class="card-meta card-meta-subtle">${card.position} · ${card.type}</div>
          <div class="card-detail">
            <strong>이 카드가 필요할 때</strong>
            <p>${card.whenToUse}</p>
          </div>
          <div class="card-detail">
            <strong>지금 할 것</strong>
            <p>${card.immediateAction}</p>
          </div>
          ${
            linkedPacks.length
              ? `<div class="card-detail">
                  <strong>더 필요하면 볼 팩</strong>
                  <p>${linkedPacks.join(" · ")}</p>
                </div>`
              : ""
          }
          <button class="inline-action" type="button" data-card-id="${card.id}">이 카드로 해보기</button>
        </article>
      `;
      }
    )
    .join("");
}

function handleCardSelect(event) {
  const button = event.target.closest("[data-card-id]");

  if (!button) {
    return;
  }

  selectedCard = cardsById.get(button.dataset.cardId);

  if (!selectedCard) {
    return;
  }

  renderSignalPanel();
  renderMileagePanel();
  renderRecommendedPacks();
  goToStep(4);
}

function renderSignalPanel() {
  const greenSignals = [
    selectedCard.greenState,
    "지금 이 방법이 상황을 정리하는 데 도움이 되고 있어요.",
    "다만 너무 오래 끌고 가지는 않는지만 가볍게 확인해 주세요."
  ].filter(Boolean);
  const yellowSignals = [
    selectedCard.yellowState,
    "아직 위험한 상태는 아니지만, 이 방법을 오래 쓰고 있다는 신호일 수 있어요.",
    "몸이나 마음이 조금씩 부담을 느끼기 시작할 수 있어요."
  ].filter(Boolean);
  const redSignals = selectedCard.redSignals?.length
    ? selectedCard.redSignals
    : ["이 방법을 계속 쓰면 나나 상황이 더 무거워질 수 있어요."];
  const releaseLines = selectedCard.roleReleaseLines?.length
    ? selectedCard.roleReleaseLines
    : ["지금 이 역할을 끝까지 붙잡지 않아도 됩니다.", "잠깐 내려와도 됩니다.", "다른 방식으로 바꿔도 됩니다."];

  signalPanel.innerHTML = `
    <article class="signal-card">
      <h3>${selectedCard.cardName}</h3>
      <p class="definition">${selectedCard.oneLine}</p>
      <div class="card-meta card-meta-subtle">${selectedCard.position} · ${selectedCard.type}</div>
      <div class="action-focus-card">
        <strong>지금 할 것</strong>
        <p>${selectedCard.immediateAction}</p>
      </div>
      <div class="card-detail">
        <strong>하나만 해보기</strong>
        <p>지금은 끝내려고 하지 말고, 위 행동 하나만 해본 뒤 멈춰도 됩니다.</p>
      </div>
      <div class="signal-helper">
        <strong>무리하고 있는지 가볍게 확인하기</strong>
        <p>이 카드를 쓰다가 부담이 커지는지 확인하고 싶을 때만 봐도 됩니다.</p>
      </div>
      <div class="signal-grid">
        <div class="green-signal-box">
          <strong>🟢 '${selectedCard.cardName}'을 괜찮게 쓰는 중</strong>
          <ul class="signal-list">
            ${greenSignals.map((signal) => `<li>${signal}</li>`).join("")}
          </ul>
        </div>
        <div class="yellow-signal-box">
          <strong>🟡 '${selectedCard.cardName}'이 조금 과해지는 중</strong>
          <ul class="signal-list">
            ${yellowSignals.map((signal) => `<li>${signal}</li>`).join("")}
          </ul>
        </div>
        <div class="red-signal-box">
          <strong>🔴 지금은 '${selectedCard.cardName}'을 줄일 때</strong>
          <ul class="signal-list">
            ${redSignals.map((signal) => `<li>${signal}</li>`).join("")}
          </ul>
        </div>
      </div>
      <div class="role-release-box">
        <strong>🌿 ${selectedCard.roleReleaseTitle || "지금은 이렇게 내려놓아도 됩니다"}</strong>
        <ul class="release-list">
          ${releaseLines.map((line) => `<li>${line}</li>`).join("")}
        </ul>
      </div>
    </article>
  `;
}

function renderClassButtons() {
  classButtons.innerHTML = classes
    .map(
      (profile) => `
        <button class="class-chip" type="button" data-class-id="${profile.id}">
          <span class="class-display-label">${getClassDisplayLabel(profile)}</span>
          <span class="class-display-description">${getClassDisplayDescription(profile)}</span>
        </button>
      `
    )
    .join("");
}

function getMileageComment(profile, card) {
  const cardLabel = `${card.position}/${card.type}`;
  const isNatural = profile.oftenTurnsOn.includes(cardLabel);
  const isHighCost = profile.highCostCards.includes(cardLabel);
  const packName = choosePackForCard(profile, card);

  if (isNatural) {
    return {
      tone: "natural",
      text: "평소 내 방식과 비교적 잘 맞는 카드입니다.",
      packName
    };
  }

  if (isHighCost) {
    return {
      tone: "costly",
      text: "오래 쓰면 나에게 피곤해질 수 있는 카드입니다.",
      packName
    };
  }

  return {
    tone: "neutral",
    text: "평소 방식과 조금 다를 수 있지만, 지금은 참고해볼 만합니다.",
    packName
  };
}

function choosePackForCard(profile, card) {
  const contextual = cardPackMap[card.id] || [];
  return profile?.recommendedPacks.find((pack) => contextual.includes(pack)) ||
    contextual[0] ||
    profile?.recommendedPacks[0] ||
    "자원 회복 미니팩";
}

function getPackDisplayName(pack) {
  return pack?.displayName || pack?.packName || "";
}

function getPackDescription(pack) {
  return pack?.displayDescription || pack?.oneLine || "";
}

function getLinkedPackDisplayNames(card) {
  return (cardPackMap[card.id] || [])
    .map((packName) => getPackDisplayName(packsByName.get(packName)))
    .filter(Boolean)
    .slice(0, 2);
}

function renderMileagePanel() {
  if (!selectedCard) {
    mileagePanel.innerHTML = `<div class="empty-state">먼저 카드를 하나 골라 주세요.</div>`;
    return;
  }

  if (!selectedClass) {
    classEmptyNote.hidden = false;
    mileagePanel.innerHTML = `
      <div class="mileage-card">
        <span class="panel-label">내 평소 방식</span>
        <p>내 평소 방식을 고르면 이 카드가 나에게 편한지, 오래 쓰면 피곤한지 볼 수 있어요.</p>
      </div>
    `;
    return;
  }

  classEmptyNote.hidden = true;
  const mileage = getMileageComment(selectedClass, selectedCard);
  mileagePanel.innerHTML = `
    <article class="mileage-card ${mileage.tone}">
      <span class="panel-label">내 평소 방식</span>
      <h3>${getClassDisplayLabel(selectedClass)}</h3>
      <p>${mileage.text}</p>
      <p>이 카드를 쓸 때는 <strong>${getPackDisplayName(packsByName.get(mileage.packName))}</strong>을 함께 확인하세요.</p>
    </article>
  `;
}

function handleClassSelect(event) {
  const button = event.target.closest("[data-class-id]");

  if (!button) {
    return;
  }

  selectedClass = classes.find((profile) => profile.id === button.dataset.classId);

  document
    .querySelectorAll(".class-chip")
    .forEach((item) => item.classList.toggle("is-selected", item === button));

  renderMileagePanel();
  renderRecommendedPacks();
}

function getRecommendedPackNames() {
  if (supplyLow) {
    return ["자원 회복 미니팩"];
  }

  if (!selectedCard) {
    return [];
  }

  const contextual = cardPackMap[selectedCard.id] || [];
  const classPacks = selectedClass?.recommendedPacks || [];
  return [...new Set([...contextual, ...classPacks])].slice(0, 3);
}

function renderRecommendedPacks() {
  const packs = getRecommendedPackNames();

  if (!packs.length) {
    recommendedPacks.innerHTML = `<div class="empty-state">카드를 고르면 같이 볼 팩이 표시됩니다.</div>`;
    return;
  }

  recommendedPacks.innerHTML = `
    <span class="panel-label">같이 볼 팩</span>
    <div class="pack-button-list">
      ${packs
        .map(
          (packName) => {
            const pack = packsByName.get(packName);

            return `
            <button class="pack-equip-button" type="button" data-pack-name="${packName}">
              <strong>${getPackDisplayName(pack)}</strong>
              ${getPackDescription(pack) ? `<small>${getPackDescription(pack)}</small>` : ""}
              <span>보기</span>
            </button>
          `;
          }
        )
        .join("")}
    </div>
  `;
}

function handleSupplyPackEquip() {
  supplyLow = true;
  selectedPack = packsByName.get("자원 회복 미니팩");
  renderRecommendedPacks();
  renderPackDetail("자원 회복 미니팩");
  goToStep(6);
}

function handlePackEquip(event) {
  const button = event.target.closest("[data-pack-name]");

  if (!button) {
    return;
  }

  renderPackDetail(button.dataset.packName);
}

function renderPackDetail(packName) {
  const pack = packsByName.get(packName);

  if (!pack) {
    packDetail.innerHTML = `<div class="empty-state">아직 연결된 팩 내용이 없습니다.</div>`;
    return;
  }

  selectedPack = pack;

  renderStandardPack(pack);
}

function renderPackShell(pack, body) {
  packDetail.innerHTML = `
    <article class="pack-card equipped-pack">
      <span class="panel-label">고른 팩</span>
      <h3>${getPackDisplayName(pack)}</h3>
      <p class="definition">${getPackDescription(pack)}</p>
      <div class="pack-grid">
        <div class="profile-detail">
          <strong>이 팩이 필요할 때</strong>
          <p>${pack.whenToUse}</p>
        </div>
        <div class="profile-detail">
          <strong>첫 단계</strong>
          <p>${pack.firstStep}</p>
        </div>
        <div class="profile-detail">
          <strong>이 팩이 도와주는 것</strong>
          <p>${pack.packRole}</p>
        </div>
      </div>
      ${body}
      <div class="profile-note">
        <strong>메모</strong>
        <p>${pack.note}</p>
      </div>
    </article>
  `;
}

function getPackCards(pack) {
  return packCardsByPackId.get(pack.id) || [];
}

function renderStandardPack(pack) {
  const packCards = getPackCards(pack);
  const body = `
    <div class="pack-cards-area">
      <strong class="pack-area-title">이 팩에서 볼 것</strong>
      ${pack.steps?.length
        ? pack.steps.map((step) => renderPackStep(step, packCards)).join("")
        : pack.cardGroups
          .map((group) => renderPackGroup(group, packCards.filter((card) => card.group === group)))
          .join("")}
    </div>
  `;
  renderPackShell(pack, body);
}

function getCardsForStep(step, packCards) {
  const cardsById = new Map(packCards.map((card) => [card.id, card]));
  const excludedIds = new Set(step.excludeCardIds || []);
  const selected = [];

  if (step.groups?.length) {
    step.groups.forEach((group) => {
      packCards
        .filter((card) => card.group === group && !excludedIds.has(card.id))
        .forEach((card) => selected.push(card));
    });
  }

  if (step.cardIds?.length) {
    step.cardIds.forEach((cardId) => {
      const card = cardsById.get(cardId);

      if (card) {
        selected.push(card);
      }
    });
  }

  return [...new Map(selected.map((card) => [card.id, card])).values()];
}

function renderPackStep(step, packCards) {
  const title = `${step.stepNumber}단계. ${step.stepTitle}`;
  return renderPackGroup(title, getCardsForStep(step, packCards));
}

function renderPackGroup(groupTitle, cards) {
  return `
    <section class="pack-group">
      <h4>${groupTitle}</h4>
      <div class="pack-card-list">
        ${cards
          .map(
            (card) => `
              <article class="mini-pack-card">
                <h5>${card.cardName}</h5>
                <p>${card.oneLine}</p>
                <div>
                  <strong>쓸 때</strong>
                  <span>${card.whenToUse}</span>
                </div>
                <div>
                  <strong>바로 할 행동</strong>
                  <span>${card.immediateAction}</span>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderFinalAction() {
  // Legacy helper kept for reference. The separate action step is no longer used in the main MVP flow.
  let action = "물 한 잔 마시기";

  if (selectedPack?.id === "restart-pack") {
    action = "5분만 켜기";
  } else if (selectedPack?.id === "standard-pack") {
    action = "기준 하나만 적기";
  } else if (selectedPack?.id === "variation-sustain-pack") {
    action = "새 선택 금지하고 하나만 마무리하기";
  } else if (selectedPack?.id === "relationship-armor-pack") {
    action = "잠깐 빠져나오기";
  } else if (selectedPack?.firstStep) {
    action = selectedPack.firstStep;
  } else if (selectedCard?.immediateAction) {
    action = selectedCard.immediateAction;
  }

  finalAction.innerHTML = `
    <article class="final-card">
      <span class="panel-label">작게 해보기</span>
      <h3>${action}</h3>
      <p>더 분석하지 않고, 이 행동 하나만 작게 해봅니다.</p>
    </article>
  `;
}

function handleProgressClick(event) {
  const button = event.target.closest("[data-step]");

  if (!button) {
    return;
  }

  const step = Number(button.dataset.step);

  if (step <= currentStep) {
    goToStep(step);
  }
}

function resetPrototype() {
  hideExternalEntryNotice();
  selectedStateData = null;
  recommendedCards = [];
  selectedCard = null;
  selectedClass = null;
  selectedPack = null;
  supplyLow = false;
  supplyChecks.querySelectorAll("input").forEach((input) => {
    input.checked = false;
  });
  clearSupplyOkaySelection();
  supplyPackButton.hidden = true;
  supplyResult.textContent = "해당되는 항목을 체크한 뒤 다음 흐름을 봅니다.";
  positionPanel.innerHTML = `
    <span class="panel-label">지금 내 방식과 가까운 카드</span>
    <p>아직 선택한 상태가 없습니다.</p>
  `;
  cardResults.innerHTML = "";
  signalPanel.innerHTML = "";
  mileagePanel.innerHTML = "";
  recommendedPacks.innerHTML = "";
  packDetail.innerHTML = `<div class="empty-state">아직 고른 팩이 없습니다.</div>`;
  finalAction.innerHTML = "";
  document.querySelectorAll(".is-selected").forEach((item) => item.classList.remove("is-selected"));
  goToStep(0);
}

function handleNextClick(event) {
  const button = event.target.closest("[data-next-step]");

  if (!button) {
    return;
  }

  const step = Number(button.dataset.nextStep);

  if (step === 0) {
    resetPrototype();
    return;
  }

  goToStep(step);
}

async function init() {
  try {
    await loadPrototypeData();
    renderSupplyChecks();
    renderStateButtons();
    renderClassButtons();
    renderRecommendedPacks();
    goToStep(0);

    progressBar.addEventListener("click", handleProgressClick);
    supplyChecks.addEventListener("change", handleSupplyInputChange);
    supplyCheckButton.addEventListener("click", handleSupplyCheck);
    supplyOkayButton.addEventListener("click", selectSupplyOkay);
    supplyPackButton.addEventListener("click", handleSupplyPackEquip);
    stateButtons.addEventListener("click", handleStateClick);
    cardResults.addEventListener("click", handleCardSelect);
    classButtons.addEventListener("click", handleClassSelect);
    recommendedPacks.addEventListener("click", handlePackEquip);
    document.addEventListener("click", handleNextClick);
    handleExternalEntry();
  } catch (error) {
    supplyResult.textContent = error.message;
  }
}

init();
