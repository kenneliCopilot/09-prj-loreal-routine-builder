const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const clearAllBtn = document.getElementById("clearAllBtn");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

let allProducts = [];
let selectedProducts = [];
let messages = [
  {
    role: "system",
    content:
      "You are a helpful L'Oréal skincare and beauty advisor. Answer only questions related to routines, products, and care tips.",
  },
];

// ---------- 工具函数 ----------

function saveToLocalStorage() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem("selectedProducts");
  if (stored) {
    selectedProducts = JSON.parse(stored);
    updateSelectedList();
  }
}

// 显示选中产品列表
function updateSelectedList() {
  selectedProductsList.innerHTML = "";
  selectedProducts.forEach((product) => {
    const div = document.createElement("div");
    div.className = "selected-item";
    div.innerHTML = `
      ${product.name} (${product.brand})
      <button class="remove-btn" data-id="${product.id}">❌</button>
    `;
    selectedProductsList.appendChild(div);
  });
  saveToLocalStorage();
}

// 清空全部
clearAllBtn.addEventListener("click", () => {
  selectedProducts = [];
  updateSelectedList();
  document.querySelectorAll(".product-card").forEach((card) => {
    card.classList.remove("selected");
  });
});

// 加载产品
async function loadProducts() {
  const res = await fetch("products.json");
  const data = await res.json();
  allProducts = data.products;
  return allProducts;
}

// 显示产品卡片
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (p) => `
    <div class="product-card" data-id="${p.id}">
      <img src="${p.image}" alt="${p.name}">
      <div class="product-info">
        <h3>${p.name}</h3>
        <p><strong>${p.brand}</strong></p>
        <p class="description" style="display:none; color:#444;">${p.description}</p>
      </div>
    </div>
  `
    )
    .join("");

  // 绑定点击事件
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = parseInt(card.dataset.id);
      const product = allProducts.find((p) => p.id === id);
      const index = selectedProducts.findIndex((p) => p.id === id);

      // 展开描述
      const desc = card.querySelector(".description");
      desc.style.display = desc.style.display === "none" ? "block" : "none";

      // 选中/取消逻辑
      if (index > -1) {
        selectedProducts.splice(index, 1);
        card.classList.remove("selected");
      } else {
        selectedProducts.push(product);
        card.classList.add("selected");
      }
      updateSelectedList();
    });
  });
}

// 删除选中项
selectedProductsList.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-btn")) {
    const id = parseInt(e.target.dataset.id);
    selectedProducts = selectedProducts.filter((p) => p.id !== id);
    updateSelectedList();

    const card = document.querySelector(`.product-card[data-id="${id}"]`);
    if (card) card.classList.remove("selected");
  }
});

// 分类筛选
categoryFilter.addEventListener("change", async (e) => {
  const selectedCategory = e.target.value;
  const products = await loadProducts();
  const filtered = products.filter((p) => p.category === selectedCategory);
  displayProducts(filtered);
});

// 生成例程
generateBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0)
    return alert("Please select products first!");

  const productData = selectedProducts.map(
    ({ name, brand, category, description }) => ({
      name,
      brand,
      category,
      description,
    })
  );

  const input = `Please create a skincare or beauty routine using the following L'Oréal products:\n${JSON.stringify(
    productData,
    null,
    2
  )}`;

  addMessage("user", "Generate a routine with my selected products...");
  addMessage("assistant", "Thinking...");

  messages.push({ role: "user", content: input });

  try {
    const res = await fetch("https://loreal-chat-proxy.mrna.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 400,
      }),
    });

    const data = await res.json();
    const reply =
      data.choices?.[0]?.message?.content?.trim() || "Error from AI.";
    messages.push({ role: "assistant", content: reply });

    updateLastBotMessage(reply);
  } catch (err) {
    updateLastBotMessage("Something went wrong.");
    console.error(err);
  }
});

// 聊天提交
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = userInput.value.trim();
  if (!input) return;

  addMessage("user", input);
  addMessage("assistant", "Thinking...");
  messages.push({ role: "user", content: input });

  try {
    const res = await fetch("https://loreal-chat-proxy.mrna.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 200,
      }),
    });

    const data = await res.json();
    const reply =
      data.choices?.[0]?.message?.content?.trim() || "Error from AI.";
    messages.push({ role: "assistant", content: reply });

    updateLastBotMessage(reply);
  } catch (err) {
    updateLastBotMessage("Something went wrong.");
    console.error(err);
  }

  userInput.value = "";
});

// 聊天 UI 更新
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `chat-msg ${sender}`;

  if (sender === "assistant" && text === "Thinking...") {
    // 先插入 placeholder（后续再更新）
    msg.textContent = text;
  } else {
    // 正常消息直接用 Markdown 渲染
    const parsedHTML = marked.parse(text);
    msg.innerHTML = `<div class="markdown-body">${parsedHTML}</div>`;
  }

  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function updateLastBotMessage(text) {
  const botMsgs = [...chatWindow.querySelectorAll(".chat-msg.bot")];
  const parsedHTML = marked.parse(text);
  const wrapped = `<div class="markdown-body">${parsedHTML}</div>`;

  if (botMsgs.length === 0) {
    console.warn("⚠️ No bot message found — inserting new instead.");
    addMessage("assistant", text); // 兜底插入
    return;
  }

  const last = botMsgs[botMsgs.length - 1];

  console.time("⏱️ DOM update");
  last.innerHTML = wrapped;
  console.timeEnd("⏱️ DOM update");

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 初始化
loadFromLocalStorage();
