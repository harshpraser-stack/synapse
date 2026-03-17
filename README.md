<img width="1271" height="539" alt="Screenshot 2026-03-17 at 4 00 26 PM" src="https://github.com/user-attachments/assets/28b8a458-0d48-4613-9832-e73305e070da" />


<img width="1267" height="752" alt="Screenshot 2026-03-17 at 4 31 36 PM" src="https://github.com/user-attachments/assets/8507ab52-093e-4406-9451-a4dc63549a40" />



---

## 🔄 Workflow
1. Webhook → receives input  
2. Gemini → generates questions + graph  
3. Code Node → formats HTML  
4. Gmail → sends email  
5. Response → returns data to UI  

---

## 🌐 Features
- Question generation  
- Knowledge graph visualization  
- Answer key toggle  
- PDF download  
- Email delivery  

---

## 🛠️ Tech Stack
- Frontend: HTML, CSS, JS  
- Automation: n8n  
- AI: Gemini 1.5 Flash  
- Graph: D3.js  
- Email: Gmail  
- Hosting: Vercel  

---

## 🚀 Setup
```bash
N8N_SECURE_COOKIE=false n8n start


# 📝 QuestionCraft AI

Automates generation of **concept-aware question papers** using AI and visualizes knowledge via graphs.

---

## 📌 Problem
- Time-consuming manual question creation  
- Repetitive and unstructured  
- No automation or concept mapping  

---

## 💡 Solution
- Input topic + content via web UI  
- Generate questions using **Gemini AI**  
- Create **knowledge graph (D3.js)**  
- Send formatted paper via **email**  
- Real-time response to frontend  

---

## 🏗️ Architecture
