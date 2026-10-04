const STORAGE_KEY = "torelog-workouts-v1";
const form = document.querySelector("#workout-form");
const historyList = document.querySelector("#history-list");
const emptyState = document.querySelector("#empty-state");
const bodyPartSummaries = document.querySelector("#body-part-summaries");
const summaryEmpty = document.querySelector("#summary-empty");
const filter = document.querySelector("#history-filter");
const bodyPartFilter = document.querySelector("#body-part-filter");
const historySort = document.querySelector("#history-sort");
const storageError = document.querySelector("#storage-error");
const message = document.querySelector("#form-message");
const exerciseList = document.querySelector("#exercise-list");
const addExerciseButton = document.querySelector("#add-exercise");
const editDialog = document.querySelector("#edit-dialog");
const editForm = document.querySelector("#edit-form");
const editCard = document.querySelector("#edit-exercise-card");
const editSetList = document.querySelector("#edit-set-list");
const editMessage = document.querySelector("#edit-message");
let editingWorkoutId = null;

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
    monthDay: new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date),
    weekday: new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date),
  };
}

function volume(workout) {
  return workout.sets.reduce((sum, set) => sum + set.reps * set.weight, 0);
}

function addSet(card, weight = "", reps = "") {
  const setList = card.querySelector(".set-list");
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
  repsInput.placeholder = "例：10";
  repsInput.value = String(reps);
  const weightInput = document.createElement("input");
  weightInput.className = "set-input";
  weightInput.type = "number";
  weightInput.min = "0";
  weightInput.max = "9999";
  weightInput.step = "0.1";
  weightInput.required = true;
  weightInput.placeholder = "例：50";
  weightInput.value = String(weight);
  const remove = document.createElement("button");
  remove.className = "remove-set-button";
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "このセットを削除");
  remove.addEventListener("click", () => {
    if (setList.children.length > 1) {
      row.remove();
      updateSetRows(card);
    }
  });

  row.append(number, weightInput, repsInput, remove);
  setList.append(row);
  updateSetRows(card);
}

function updateSetRows(card) {
  const setList = card.querySelector(".set-list");
  Array.from(setList.children).forEach((row, index) => {
    row.querySelector(".set-number").textContent = `${index + 1}`;
    row.querySelector('input[type="number"]').setAttribute("aria-label", `セット${index + 1}の重量 kg`);
    row.querySelectorAll('input[type="number"]')[1].setAttribute("aria-label", `セット${index + 1}の回数`);
    row.querySelector(".remove-set-button").disabled = setList.children.length === 1;
  });
}

function updateExerciseCards() {
  Array.from(exerciseList.children).forEach((card, index) => {
    card.querySelector(".exercise-card-title").textContent = `種目 ${index + 1}`;
    card.querySelector(".exercise-name").setAttribute("aria-label", `種目${index + 1}の名前`);
    card.querySelector(".exercise-note").setAttribute("aria-label", `種目${index + 1}のメモ`);
    card.querySelector(".remove-exercise-button").disabled = exerciseList.children.length === 1;
  });
}

function addExercise() {
  const card = document.createElement("section");
  card.className = "exercise-card";

  const heading = document.createElement("div");
  heading.className = "exercise-card-heading";
  const title = document.createElement("span");
  title.className = "exercise-card-title";
  const removeExercise = document.createElement("button");
  removeExercise.className = "remove-exercise-button";
  removeExercise.type = "button";
  removeExercise.textContent = "種目を削除";
  removeExercise.addEventListener("click", () => {
    if (exerciseList.children.length > 1) {
      card.remove();
      updateExerciseCards();
    }
  });
  heading.append(title, removeExercise);

  const exerciseField = document.createElement("label");
  exerciseField.className = "field";
  const exerciseLabel = document.createElement("span");
  exerciseLabel.textContent = "種目名";
  const exerciseInput = document.createElement("input");
  exerciseInput.className = "exercise-name";
  exerciseInput.type = "text";
  exerciseInput.maxLength = 60;
  exerciseInput.placeholder = "例：ベンチプレス";
  exerciseInput.required = true;
  exerciseField.append(exerciseLabel, exerciseInput);

  const setSection = document.createElement("div");
  setSection.className = "set-section";
  const setHeading = document.createElement("div");
  setHeading.className = "set-heading";
  for (const text of ["セット", "重量", "回数", "操作"]) {
    const label = document.createElement("span");
    label.textContent = text;
    if (text === "操作") label.className = "visually-hidden";
    setHeading.append(label);
  }
  const setList = document.createElement("div");
  setList.className = "set-list";
  const addSetButton = document.createElement("button");
  addSetButton.className = "add-set-button";
  addSetButton.type = "button";
  addSetButton.textContent = "＋ セットを追加";
  addSetButton.addEventListener("click", () => addSet(card));
  setSection.append(setHeading, setList, addSetButton);

  const noteField = document.createElement("label");
  noteField.className = "field";
  const noteLabel = document.createElement("span");
  noteLabel.textContent = "メモ（任意）";
  const noteInput = document.createElement("textarea");
  noteInput.className = "exercise-note";
  noteInput.maxLength = 200;
  noteInput.rows = 2;
  noteInput.placeholder = "この種目のメモ";
  noteField.append(noteLabel, noteInput);

  card.append(heading, exerciseField, setSection, noteField);
  exerciseList.append(card);
  for (let i = 0; i < 3; i++) addSet(card);
  updateExerciseCards();
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

function renderBodyPartSummaries() {
  const grouped = new Map();
  for (const workout of workouts) {
    const bodyPart = workout.bodyPart || "部位未設定";
    if (!grouped.has(bodyPart)) grouped.set(bodyPart, new Map());
    const dates = grouped.get(bodyPart);
    if (!dates.has(workout.date)) dates.set(workout.date, []);
    dates.get(workout.date).push(workout);
  }

  bodyPartSummaries.replaceChildren();
  const dateFormat = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const bodyParts = [...grouped.keys()].sort((a, b) => a.localeCompare(b, "ja"));
  summaryEmpty.hidden = bodyParts.length > 0;

  for (const bodyPart of bodyParts) {
    const [latestDate, latestWorkouts] = [...grouped.get(bodyPart)]
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))[0];
    const card = document.createElement("article");
    card.className = "part-summary";
    const heading = document.createElement("div");
    heading.className = "part-summary-heading";
    const title = document.createElement("h3");
    title.textContent = bodyPart;
    const dateLabel = document.createElement("time");
    dateLabel.className = "part-summary-date";
    dateLabel.dateTime = latestDate;
    dateLabel.textContent = dateFormat.format(new Date(`${latestDate}T00:00:00`));
    heading.append(title, dateLabel);

    const exercises = document.createElement("div");
    exercises.className = "part-summary-exercises";
    latestWorkouts
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach((workout) => {
        const exercise = document.createElement("div");
        exercise.className = "part-summary-exercise";
        const exerciseName = document.createElement("p");
        exerciseName.className = "part-summary-exercise-name";
        exerciseName.textContent = workout.exercise;
        const sets = document.createElement("div");
        sets.className = "part-summary-sets";
        workout.sets.forEach((set, index) => {
          const setLabel = document.createElement("span");
          setLabel.className = "part-summary-set";
          setLabel.textContent = `${index + 1}: ${set.weight}kg × ${set.reps}回`;
          sets.append(setLabel);
        });
        if (workout.sets.length === 0) {
          const noSets = document.createElement("p");
          noSets.className = "part-summary-empty";
          noSets.textContent = "セット記録なし";
          sets.append(noSets);
        }
        exercise.append(exerciseName, sets);
        exercises.append(exercise);
      });

    if (latestWorkouts.length === 0) {
      const noExercises = document.createElement("p");
      noExercises.className = "part-summary-empty";
      noExercises.textContent = "種目記録なし";
      exercises.append(noExercises);
    }

    card.append(heading, exercises);
    bodyPartSummaries.append(card);
  }
}

function render() {
  renderBodyPartSummaries();

  updateBodyPartFilter();
  const thisWeek = workouts.filter((workout) => isThisWeek(workout.date));
  const periodWorkouts = filter.value === "week" ? thisWeek : workouts;
  const sortDirection = historySort.value === "oldest" ? 1 : -1;
  const visible = periodWorkouts
    .filter((workout) => bodyPartFilter.value === "all"
      || (workout.bodyPart || "部位未設定") === bodyPartFilter.value)
    .slice()
    .sort((a, b) => sortDirection * (a.date.localeCompare(b.date) || a.createdAt - b.createdAt));

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
    const monthDay = document.createElement("strong");
    monthDay.textContent = date.monthDay;
    const weekday = document.createElement("span");
    weekday.textContent = date.weekday;
    badge.append(monthDay, weekday);

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
    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const edit = document.createElement("button");
    edit.className = "edit-button";
    edit.type = "button";
    edit.textContent = "編集";
    edit.setAttribute("aria-label", `${workout.exercise}の記録を編集`);
    edit.addEventListener("click", () => openEditDialog(workout));
    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.textContent = "削除";
    remove.setAttribute("aria-label", `${workout.exercise}の記録を削除`);
    remove.addEventListener("click", () => deleteWorkout(workout.id));
    actions.append(edit, remove);
    end.append(total, actions);
    item.append(badge, info, end);
    historyList.append(item);
  }
}

function openEditDialog(workout) {
  editingWorkoutId = workout.id;
  document.querySelector("#edit-date").value = workout.date;
  document.querySelector("#edit-body-part").value = workout.bodyPart || "";
  document.querySelector("#edit-exercise").value = workout.exercise;
  document.querySelector("#edit-note").value = workout.note || "";
  editSetList.replaceChildren();
  for (const set of workout.sets) addSet(editCard, set.weight, set.reps);
  editMessage.textContent = "";
  editMessage.classList.remove("error");
  editDialog.showModal();
}

function closeEditDialog() {
  editDialog.close();
  editingWorkoutId = null;
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

document.querySelector("#edit-add-set").addEventListener("click", () => addSet(editCard));
document.querySelector("#close-edit").addEventListener("click", closeEditDialog);
document.querySelector("#cancel-edit").addEventListener("click", closeEditDialog);
editDialog.addEventListener("click", (event) => {
  if (event.target === editDialog) closeEditDialog();
});
editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  editMessage.textContent = "";
  editMessage.classList.remove("error");
  if (!editForm.reportValidity()) return;

  const index = workouts.findIndex((workout) => workout.id === editingWorkoutId);
  if (index === -1) {
    editMessage.textContent = "編集する記録が見つかりません。履歴を再読み込みしてください。";
    editMessage.classList.add("error");
    return;
  }

  const sets = Array.from(editSetList.querySelectorAll(".set-row"), (row) => ({
    weight: Number(row.querySelector('input[type="number"]').value),
    reps: Number(row.querySelectorAll('input[type="number"]')[1].value),
  }));
  const updated = {
    ...workouts[index],
    date: document.querySelector("#edit-date").value,
    bodyPart: document.querySelector("#edit-body-part").value.trim(),
    exercise: document.querySelector("#edit-exercise").value.trim(),
    sets,
    note: document.querySelector("#edit-note").value.trim(),
  };
  if (!updated.date || !updated.bodyPart || !updated.exercise || sets.length === 0
      || sets.some((set) => set.reps < 1 || set.weight < 0)) {
    editMessage.textContent = "入力内容を確認してください。";
    editMessage.classList.add("error");
    return;
  }

  const previous = workouts[index];
  workouts[index] = updated;
  if (!saveWorkouts()) {
    workouts[index] = previous;
    editMessage.textContent = "保存できませんでした。ブラウザーの保存領域をご確認ください。";
    editMessage.classList.add("error");
    return;
  }
  closeEditDialog();
  render();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  message.textContent = "";
  message.classList.remove("error");
  if (!form.reportValidity()) return;

  const bodyPart = document.querySelector("#body-part").value.trim();
  const entries = Array.from(exerciseList.querySelectorAll(".exercise-card"), (card, index) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    createdAt: Date.now() + index,
    date: dateInput.value,
    bodyPart,
    exercise: card.querySelector(".exercise-name").value.trim(),
    sets: Array.from(card.querySelectorAll(".set-row"), (row) => ({
      weight: Number(row.querySelector('input[type="number"]').value),
      reps: Number(row.querySelectorAll('input[type="number"]')[1].value),
    })),
    note: card.querySelector(".exercise-note").value.trim(),
  }));
  if (!bodyPart || !dateInput.value || entries.some((entry) => !entry.exercise
      || entry.sets.length === 0
      || entry.sets.some((set) => set.reps < 1 || set.weight < 0))) {
    message.textContent = "入力内容を確認してください。";
    message.classList.add("error");
    return;
  }

  workouts.push(...entries);
  if (!saveWorkouts()) {
    workouts.splice(-entries.length, entries.length);
    message.textContent = "保存できませんでした。入力を確認してもう一度お試しください。";
    message.classList.add("error");
    return;
  }
  form.reset();
  dateInput.value = localDate(new Date());
  exerciseList.replaceChildren();
  addExercise();
  message.textContent = `${entries.length}種目を記録しました。`;
  render();
});

addExerciseButton.addEventListener("click", addExercise);
filter.addEventListener("change", render);
bodyPartFilter.addEventListener("change", render);
historySort.addEventListener("change", render);
addExercise();
render();
