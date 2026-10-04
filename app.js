const STORAGE_KEY = "torelog-workouts-v1";
const form = document.querySelector("#workout-form");
const historyList = document.querySelector("#history-list");
const emptyState = document.querySelector("#empty-state");
const weekCount = document.querySelector("#week-count");
const weekVolume = document.querySelector("#week-volume");
const totalCount = document.querySelector("#total-count");
const filter = document.querySelector("#history-filter");
const bodyPartFilter = document.querySelector("#body-part-filter");
const storageError = document.querySelector("#storage-error");
const message = document.querySelector("#form-message");
const setList = document.querySelector("#set-list");
const addSetButton = document.querySelector("#add-set");

const dateInput = document.querySelector("#workout-date");
const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const today = new Date();
dateInput.value = localDate(today);
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
}).format(today);

function readWorkouts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const workouts = JSON.parse(saved);
    if (!Array.isArray(workouts)) throw new Error("保存データの形式が正しくありません。");
    return workouts.map((workout) => {
      if (Array.isArray(workout.sets)) return workout;
      return {
        ...workout,
        sets: Array.from({ length: workout.sets }, () => ({
          weight: workout.weight,
          reps: workout.reps,
        })),
      };
    });
  } catch (error) {
    storageError.hidden = false;
    console.error("トレーニング記録を読み込めませんでした。", error);
    return [];
  }
}

let workouts = readWorkouts();

function saveWorkouts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
    storageError.hidden = true;
    return true;
  } catch (error) {
    storageError.hidden = false;
    console.error("トレーニング記録を保存できませんでした。", error);
    return false;
  }
}

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function isThisWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const start = startOfWeek(today);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return {
    day: new Intl.DateTimeFormat("ja-JP", { day: "numeric" }).format(date),
    weekday: new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date),
  };
}

function volume(workout) {
  return workout.sets.reduce((sum, set) => sum + set.reps * set.weight, 0);
}

function addSet(weight = 0, reps = 10) {
  if (setList.children.length >= 99) return;
  const row = document.createElement("div");
  row.className = "set-row";

  const number = document.createElement("span");
  number.className = "set-number";
  const repsInput = document.createElement("input");
  repsInput.className = "set-input";
  repsInput.type = "number";
  repsInput.min = "1";
  repsInput.max = "999";
  repsInput.required = true;
  repsInput.value = String(reps);
  const weightInput = document.createElement("input");
  weightInput.className = "set-input";
  weightInput.type = "number";
  weightInput.min = "0";
  weightInput.max = "9999";
  weightInput.step = "0.1";
  weightInput.required = true;
  weightInput.value = String(weight);
  const remove = document.createElement("button");
  remove.className = "remove-set-button";
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "このセットを削除");
  remove.addEventListener("click", () => {
    if (setList.children.length > 1) {
      row.remove();
      updateSetRows();
    }
  });

  row.append(number, weightInput, repsInput, remove);
  setList.append(row);
  updateSetRows();
}

function updateSetRows() {
  Array.from(setList.children).forEach((row, index) => {
    row.querySelector(".set-number").textContent = `${index + 1}`;
    row.querySelector('input[type="number"]').setAttribute("aria-label", `セット${index + 1}の重量 kg`);
    row.querySelectorAll('input[type="number"]')[1].setAttribute("aria-label", `セット${index + 1}の回数`);
    row.querySelector(".remove-set-button").disabled = setList.children.length === 1;
  });
}

function updateBodyPartFilter() {
  const selected = bodyPartFilter.value;
  const bodyParts = [...new Set(workouts.map((workout) => workout.bodyPart || "部位未設定"))]
    .sort((a, b) => a.localeCompare(b, "ja"));
  bodyPartFilter.replaceChildren(new Option("すべての部位", "all"));
  for (const bodyPart of bodyParts) {
    bodyPartFilter.add(new Option(bodyPart, bodyPart));
  }
  bodyPartFilter.value = bodyParts.includes(selected) ? selected : "all";
}

function render() {
  const thisWeek = workouts.filter((workout) => isThisWeek(workout.date));
  weekCount.textContent = new Set(thisWeek.map((workout) => workout.date)).size;
  weekVolume.textContent = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 })
    .format(thisWeek.reduce((sum, workout) => sum + volume(workout), 0));
  totalCount.textContent = workouts.length;

  updateBodyPartFilter();
  const periodWorkouts = filter.value === "week" ? thisWeek : workouts;
  const visible = periodWorkouts
    .filter((workout) => bodyPartFilter.value === "all"
      || (workout.bodyPart || "部位未設定") === bodyPartFilter.value)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  historyList.replaceChildren();
  emptyState.hidden = visible.length > 0;
  if (visible.length === 0 && workouts.length > 0) {
    emptyState.querySelector("h3").textContent = "記録がありません";
    emptyState.querySelector("p").textContent = "選択した条件に合う記録はありません。";
  } else {
    emptyState.querySelector("h3").textContent = "ここから始めよう";
    emptyState.querySelector("p").textContent = "最初のトレーニングを記録すると、\nここに履歴が表示されます。";
  }
  for (const workout of visible) {
    const date = formatDate(workout.date);
    const item = document.createElement("article");
    item.className = "history-item";

    const badge = document.createElement("div");
    badge.className = "date-badge";
    const day = document.createElement("strong");
    day.textContent = date.day;
    const weekday = document.createElement("span");
    weekday.textContent = date.weekday;
    badge.append(day, weekday);

    const info = document.createElement("div");
    info.className = "entry-info";
    const name = document.createElement("p");
    name.className = "entry-name";
    name.textContent = `${workout.bodyPart || "部位未設定"} · ${workout.exercise}`;
    const meta = document.createElement("p");
    meta.className = "entry-meta";
    meta.textContent = workout.sets.map((set, index) =>
      `${index + 1}セット ${set.reps}回 · ${set.weight}kg`,
    ).join(" / ");
    info.append(name, meta);
    if (workout.note) {
      const note = document.createElement("p");
      note.className = "entry-note";
      note.textContent = workout.note;
      info.append(note);
    }

    const end = document.createElement("div");
    end.className = "entry-end";
    const total = document.createElement("span");
    total.className = "entry-volume";
    total.textContent = `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 }).format(volume(workout))} kg`;
    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.textContent = "削除";
    remove.setAttribute("aria-label", `${workout.exercise}の記録を削除`);
    remove.addEventListener("click", () => deleteWorkout(workout.id));
    end.append(total, remove);
    item.append(badge, info, end);
    historyList.append(item);
  }
}

function deleteWorkout(id) {
  const previous = workouts;
  workouts = workouts.filter((workout) => workout.id !== id);
  if (!saveWorkouts()) {
    workouts = previous;
    return;
  }
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  message.textContent = "";
  message.classList.remove("error");
  if (!form.reportValidity()) return;

  const sets = Array.from(setList.querySelectorAll(".set-row"), (row) => ({
    weight: Number(row.querySelector('input[type="number"]').value),
    reps: Number(row.querySelectorAll('input[type="number"]')[1].value),
  }));
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    createdAt: Date.now(),
    date: dateInput.value,
    bodyPart: document.querySelector("#body-part").value.trim(),
    exercise: document.querySelector("#exercise").value.trim(),
    sets,
    note: document.querySelector("#note").value.trim(),
  };
  if (!entry.bodyPart || !entry.exercise || !entry.date || sets.some((set) => set.reps < 1 || set.weight < 0)) {
    message.textContent = "入力内容を確認してください。";
    message.classList.add("error");
    return;
  }

  workouts.push(entry);
  if (!saveWorkouts()) {
    workouts.pop();
    message.textContent = "保存できませんでした。入力を確認してもう一度お試しください。";
    message.classList.add("error");
    return;
  }
  form.reset();
  dateInput.value = localDate(new Date());
  setList.replaceChildren();
  for (let i = 0; i < 3; i++) addSet();
  message.textContent = "トレーニングを記録しました。";
  render();
});

addSetButton.addEventListener("click", () => addSet());
filter.addEventListener("change", render);
bodyPartFilter.addEventListener("change", render);
for (let i = 0; i < 3; i++) addSet();
render();
