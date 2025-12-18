/* =========================
   State
========================= */
const state = {
    isCanvasLocked: false,
    isDrawing: false,
    currentDexData: null,
    penColor : "#000000",
    penWidth : 4,
    isEraser : false,
    gallery: []
};

/* =========================
   DOM
========================= */
const dom = {
    canvas: document.getElementById("canvas"),
    dexNumber: document.getElementById("dex-no"),
    dexName: document.getElementById("dex-name"),
    dexDescription: document.getElementById("dex-desc"),

    answerImageWrapper: document.getElementById("answer-image-wrapper"),
    answerImage: document.getElementById("answer-image"),

    toggleAnswerButton: document.getElementById("toggle-answer-btn"),
    loadDexButton: document.getElementById("load-dex-btn"),
    clearCanvasButton: document.getElementById("clear-canvas-btn"),

    penColorInput: document.getElementById("pen-color"),
    penWidthInput: document.getElementById("pen-width"),
    eraserButton: document.getElementById("eraser-btn"),
};

const ctx = dom.canvas.getContext("2d");

/* =========================
    Canvas
========================= */
function setupCanvasEvents() {
    dom.canvas.addEventListener("pointerdown", startDrawing);
    dom.canvas.addEventListener("pointermove", draw);
    dom.canvas.addEventListener("pointerup", stopDrawing);
    window.addEventListener("resize", resizeCanvas);

    dom.clearCanvasButton.addEventListener("click", clearCanvas);

    dom.penColorInput.addEventListener("input", e => {
        state.penColor = e.target.value;
        state.isEraser = false;
    });

    dom.penWidthInput.addEventListener("input", e => {
        state.penWidth = Number(e.target.value);
    });

    dom.eraserButton.addEventListener("click", () => {
        state.isEraser = !state.isEraser;
        dom.eraserButton.textContent = state.isEraser ? "ペンに戻る" : "消しゴム";
    });
}

function startDrawing(event) {
    if (state.isCanvasLocked) return;

    state.isDrawing = true;

    ctx.beginPath();
    ctx.moveTo(event.offsetX, event.offsetY);

    ctx.lineWidth = state.penWidth;
    ctx.lineCap = "round";

    if (state.isEraser) {
        ctx.globalCompositeOperation = "destination-out";
    } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = state.penColor;
    }
}

function draw(event) {
    if (!state.isDrawing || state.isCanvasLocked) return;

    ctx.lineTo(event.offsetX, event.offsetY);
    ctx.stroke();
}

function stopDrawing() {
    state.isDrawing = false;
}

function resizeCanvas() {
    const imageDataUrl = dom.canvas.toDataURL();
    const rect = dom.canvas.getBoundingClientRect();

    dom.canvas.width = rect.width;
    dom.canvas.height = rect.height;

    const img = new Image();
    img.src = imageDataUrl;
    img.onload = () => ctx.drawImage(img, 0, 0);
}

function clearCanvas() {
    const ok = confirm("キャンバスをすべて消去します。\nよろしいですか？");
    if (!ok) return;

    ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
}

/* =========================
    Dex UI
========================= */
const initialDexData = {
    no: "???",
    name: "ポケモン名",
    desc: "ここに図鑑説明が載るよ！"
};

function setDexInfo(dexData) {
    state.currentDexData = dexData;

    dom.dexNumber.textContent = `No.${dexData.no}`;
    dom.dexName.textContent = dexData.name;
    dom.dexDescription.textContent = dexData.desc;

    dom.answerImageWrapper.hidden = true;
}

function showAnswer() {
    const ok = confirm(
        "正解を表示しますか？\n正解閲覧後は描画できなくなります。\n現在の絵は自動でギャラリーに保存されます。"
    );
    if (!ok) return;

    dom.answerImage.src = state.currentDexData.image_url;
    dom.answerImageWrapper.hidden = false;

    state.isCanvasLocked = true;
    saveCurrentDrawing();

    dom.toggleAnswerButton.disabled = true;
}

/* =========================
    Gallery
========================= */
function addGalleryItem(item) {
    const galleryListElement = document.getElementById("gallery-list");

    const itemElement = document.createElement("div");
    itemElement.className = "gallery-item";

    itemElement.innerHTML = `
        <h3 class="gallery-pokemon-name">${item.pokemonName}</h3>

        <div class="gallery-images">
            <div class="gallery-image-block">
                <p>正解</p>
                <img src="${item.correctImageUrl}" alt="正解画像">
            </div>

            <div class="gallery-image-block">
                <p>あなたの絵</p>
                <img src="${item.userImageUrl}" alt="描いた絵">
            </div>
        </div>
    `;

    galleryListElement.prepend(itemElement);
}

/* =========================
    Buttons
========================= */

function setLoadButtonDisabled(disabled) {
    dom.loadDexButton.disabled = disabled;
}

/* =========================
    API Simulation
========================= */
async function fetchDexData(id) {
       try {
        // 並列取得
        const [pokemonRes, speciesRes] = await Promise.all([
            fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
            fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`)
        ]);

        if (!pokemonRes.ok || !speciesRes.ok) {
            throw new Error("ポケモンデータの取得に失敗しました");
        }

        const pokemonData = await pokemonRes.json();
        const speciesData = await speciesRes.json();

        // 日本語名
        const jpName = speciesData.names.find(
            n => n.language.name === "ja"
        )?.name ?? pokemonData.name;
        console.log(pokemonData);
        console.log(speciesData);
        // 日本語図鑑説明（最初の1文で十分）
        const jpFlavor = speciesData.flavor_text_entries.find(
            f => f.language.name === "ja"
        )?.flavor_text
            .replace(/\n|\f/g, " ")
            ?? "説明文が取得できませんでした。";

        return {
            no: speciesData.pokedex_numbers[0]?.entry_number ?? id,
            name: jpName,
            desc: jpFlavor,
            image_url: pokemonData.sprites.other["official-artwork"].front_default
        };
    } catch (error) {
        console.error(error);
        throw "ポケモンデータを取得できませんでした";
    }
}

function getRandomDexNumber() {
    return Math.floor(Math.random() * 1017) + 1;
}

function loadRandomDex() {
    state.isCanvasLocked = false;
    setLoadButtonDisabled(true);

    const randomDexNumber = getRandomDexNumber();

    setDexInfo({
        no: randomDexNumber,
        name: "読み込み中…",
        desc: "図鑑情報を取得しています。"
    });

    fetchDexData(randomDexNumber)
        .then(setDexInfo)
        .catch(error => {
            setDexInfo({ no: "??", name: "エラー", desc: error });
        })
        .finally(() => {
            dom.toggleAnswerButton.disabled = false;
            setLoadButtonDisabled(false);
        });
}

/* =========================
    Utils
========================= */
function saveCurrentDrawing() {
    if (!state.currentDexData) return;

    const userImageUrl = dom.canvas.toDataURL("image/png");

    const galleryItem = {
        pokemonNo: state.currentDexData.no,
        pokemonName: state.currentDexData.name,
        correctImageUrl: state.currentDexData.image_url,
        userImageUrl: userImageUrl,
    };
    state.gallery.unshift(galleryItem);
    addGalleryItem(state.currentDexData);
}

/* =========================
    Init
========================= */
setupCanvasEvents();
resizeCanvas();
setDexInfo(initialDexData);
dom.toggleAnswerButton.disabled = true;

/* =========================
    UI
========================= */
function setTheme(theme) {
    document.body.className = `theme-${theme}`;
  }
