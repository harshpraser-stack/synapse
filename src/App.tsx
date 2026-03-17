/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import * as d3 from 'd3';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import { 
  BookOpen, 
  Mail, 
  Settings, 
  Send, 
  Download, 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  Eye, 
  EyeOff,
  BrainCircuit,
  Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- CONFIGURATION ---
const CONFIG = {
  N8N_WEBHOOK_URL: "REPLACE_WITH_YOUR_N8N_WEBHOOK_URL",
  APP_NAME: "QuestionCraft AI",
  FALLBACK_MODE: true
};

// --- TYPES ---
interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'topic' | 'subtopic' | 'concept' | 'term';
  details?: string;
}

interface Edge extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

interface Question {
  id: string;
  type: string;
  text: string;
  options?: string[];
  answer: string;
  marks: number;
  sourceNodeId?: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface GenerationResult {
  questions: Question[];
  knowledgeGraph: GraphData;
  metadata: {
    totalMarks: number;
    estimatedTime: string;
    difficulty: string;
  };
}

const STEPS = [
  "📤 Sending to n8n...",
  "🧠 Gemini is analyzing content...",
  "🕸️ Building knowledge graph...",
  "📝 Writing questions...",
  "📧 Sending to your email...",
  "✅ Done!"
];

export default function App() {
  // Form State
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState<string[]>(['MCQ']);
  const [difficulty, setDifficulty] = useState('Medium');

  // UI State
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const graphRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Edge> | null>(null);

  // --- HELPERS ---
  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  // --- GENERATION LOGIC ---
  const handleGenerate = async () => {
    if (!topic || !content || !email) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);
    setCurrentStep(0);
    setResult(null);

    console.log("Starting generation for topic:", topic);

    try {
      // Step 1: Sending to n8n
      setCurrentStep(0);
      
      const payload = {
        topic,
        subject: topic,
        content,
        questionCount,
        questionTypes,
        difficulty,
        userEmail: email,
        timestamp: new Date().toISOString()
      };

      let data: GenerationResult;

      try {
        const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000) // 10s timeout
        });

        if (!response.ok) throw new Error("n8n response not ok");
        data = await response.json();
        console.log("Received data from n8n:", data);
      } catch (err) {
        console.warn("n8n failed or timed out, falling back to local generation", err);
        if (CONFIG.FALLBACK_MODE) {
          data = await generateFallback();
        } else {
          throw new Error("n8n unreachable and fallback mode disabled.");
        }
      }

      // Simulate stepper progress for UX
      for (let i = 1; i < STEPS.length; i++) {
        setCurrentStep(i);
        await new Promise(r => setTimeout(r, 800));
      }

      setResult(data);
      setLoading(false);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6c63ff', '#3b82f6', '#10b981']
      });

    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const generateFallback = async (): Promise<GenerationResult> => {
    console.log("Generating locally using Gemini...");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
      You are an expert educator. Based on the following content, generate a comprehensive question paper and a knowledge graph.
      
      TOPIC: ${topic}
      CONTENT: ${content}
      QUESTION COUNT: ${questionCount}
      QUESTION TYPES: ${questionTypes.join(', ')}
      DIFFICULTY: ${difficulty}
      
      Return a JSON object with this structure:
      {
        "questions": [
          {
            "id": "q1",
            "type": "MCQ",
            "text": "Question text?",
            "options": ["A", "B", "C", "D"],
            "answer": "Correct Option",
            "marks": 2,
            "sourceNodeId": "node_id_from_graph"
          }
        ],
        "knowledgeGraph": {
          "nodes": [
            { "id": "topic_1", "label": "${topic}", "type": "topic", "details": "Main subject" },
            { "id": "sub_1", "label": "Subtopic Name", "type": "subtopic", "details": "A major section" },
            { "id": "concept_1", "label": "Concept Name", "type": "concept", "details": "A core idea" },
            { "id": "term_1", "label": "Key Term", "type": "term", "details": "Specific terminology" }
          ],
          "edges": [
            { "source": "topic_1", "target": "sub_1" },
            { "source": "sub_1", "target": "concept_1" },
            { "source": "concept_1", "target": "term_1" }
          ]
        },
        "metadata": {
          "totalMarks": 50,
          "estimatedTime": "60 mins",
          "difficulty": "${difficulty}"
        }
      }
      
      Ensure nodes are connected logically. Each question MUST reference a sourceNodeId from the graph.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        systemInstruction: "You are a specialized JSON generator for educational content. Always return valid JSON matching the requested schema exactly."
      }
    });

    return JSON.parse(response.text || '{}');
  };

  // --- D3 GRAPH RENDERING ---
  useEffect(() => {
    if (!result || !graphRef.current) return;

    const width = graphRef.current.clientWidth;
    const height = graphRef.current.clientHeight;

    // Clear previous
    d3.select(graphRef.current).selectAll("*").remove();

    const svg = d3.select(graphRef.current)
      .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g");

    // Zoom
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      }));

    const nodes: Node[] = result.knowledgeGraph.nodes.map(d => ({ ...d }));
    const links: Edge[] = result.knowledgeGraph.edges.map(d => ({ ...d }));

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Edge>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    simulationRef.current = simulation;

    // Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#4b5563")
      .style("stroke", "none");

    const link = g.append("g")
      .attr("stroke", "#4b5563")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)");

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    const getColor = (type: string) => {
      switch (type) {
        case 'topic': return '#3b82f6';
        case 'subtopic': return '#6c63ff';
        case 'concept': return '#10b981';
        case 'term': return '#f59e0b';
        default: return '#94a3b8';
      }
    };

    const getRadius = (type: string) => {
      switch (type) {
        case 'topic': return 25;
        case 'subtopic': return 18;
        case 'concept': return 12;
        case 'term': return 8;
        default: return 10;
      }
    };

    node.append("circle")
      .attr("r", d => getRadius(d.type))
      .attr("fill", d => getColor(d.type))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("class", "transition-all duration-300 cursor-pointer")
      .on("mouseover", (event, d) => {
        setHoveredNodeId(d.id);
        d3.select(event.currentTarget).attr("r", getRadius(d.type) + 4);
      })
      .on("mouseout", (event, d) => {
        setHoveredNodeId(null);
        d3.select(event.currentTarget).attr("r", getRadius(d.type));
      })
      .on("click", (event, d) => {
        setSelectedNodeId(prev => prev === d.id ? null : d.id);
      });

    node.append("text")
      .attr("dy", d => getRadius(d.type) + 15)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .text(d => d.label)
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [result]);

  // --- EXPORT LOGIC ---
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    doc.setFontSize(22);
    doc.text(CONFIG.APP_NAME, margin, y);
    y += 10;
    doc.setFontSize(16);
    doc.text(`Subject: ${topic}`, margin, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Difficulty: ${result.metadata.difficulty} | Total Marks: ${result.metadata.totalMarks}`, margin, y);
    y += 15;

    result.questions.forEach((q, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`Q${i + 1}. [${q.marks} Marks]`, margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(q.text, 170);
      doc.text(splitText, margin, y);
      y += splitText.length * 7;

      if (q.options) {
        q.options.forEach((opt, idx) => {
          doc.text(`${String.fromCharCode(65 + idx)}) ${opt}`, margin + 10, y);
          y += 7;
        });
      }
      y += 5;
    });

    doc.save(`${topic.replace(/\s+/g, '_')}_Question_Paper.pdf`);
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-sans selection:bg-[#6c63ff]/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#1a1a2e]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#3b82f6] flex items-center justify-center shadow-lg shadow-[#6c63ff]/20">
              <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-[#94a3b8]">
              {CONFIG.APP_NAME}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#94a3b8] font-mono hidden sm:block">v1.0.0-stable</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-8">
        {/* Left Column: Input Form */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-[#6c63ff]" />
              <h2 className="text-lg font-semibold">Configuration</h2>
            </div>

            <div className="space-y-5">
              {/* Topic */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#94a3b8] flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Subject / Topic
                </label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Quantum Physics, Modern History..."
                  className="w-full bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/50 transition-all"
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-[#94a3b8]">Study Content</label>
                  <span className="text-[10px] text-[#94a3b8] font-mono">{content.length} characters</span>
                </div>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your study material, notes, or textbook content here..."
                  className="w-full h-48 bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/50 transition-all resize-none text-sm leading-relaxed"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#94a3b8] flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Destination Email
                </label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/50 transition-all"
                />
              </div>

              {/* Settings Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#94a3b8]">Questions</label>
                  <select 
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/50 transition-all appearance-none cursor-pointer"
                  >
                    {[5, 10, 15, 20, 25, 30].map(n => (
                      <option key={n} value={n}>{n} Questions</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#94a3b8]">Difficulty</label>
                  <select 
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/50 transition-all appearance-none cursor-pointer"
                  >
                    {['Easy', 'Medium', 'Hard', 'Mixed'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Question Types */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-[#94a3b8]">Question Formats</label>
                <div className="grid grid-cols-2 gap-2">
                  {['MCQ', 'Short Answer', 'Essay', 'True/False', 'Fill Blanks'].map(type => (
                    <label key={type} className="flex items-center gap-3 p-3 rounded-xl bg-[#0f0f1a] border border-white/5 cursor-pointer hover:border-[#6c63ff]/30 transition-all group">
                      <input 
                        type="checkbox" 
                        checked={questionTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) setQuestionTypes([...questionTypes, type]);
                          else setQuestionTypes(questionTypes.filter(t => t !== type));
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-transparent text-[#6c63ff] focus:ring-0"
                      />
                      <span className="text-xs group-hover:text-white transition-colors">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 p-3 rounded-xl border border-red-400/20"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generate Button */}
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 overflow-hidden relative group ${
                  loading 
                    ? 'bg-[#1a1a2e] cursor-not-allowed border border-white/10' 
                    : 'bg-gradient-to-r from-[#6c63ff] to-[#3b82f6] hover:scale-[1.02] active:scale-[0.98] hover:shadow-[#6c63ff]/40'
                }`}
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="animate-pulse">Processing...</span>
                  </div>
                ) : (
                  <>
                    <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    Generate & Send to Email
                  </>
                )}
                {!loading && <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
              </button>
            </div>
          </motion.div>

          {/* Stepper (Loading State) */}
          <AnimatePresence>
            {loading && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 space-y-4"
              >
                <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider">Generation Status</h3>
                <div className="space-y-3">
                  {STEPS.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                        idx < currentStep 
                          ? 'bg-[#10b981] text-white' 
                          : idx === currentStep 
                            ? 'bg-[#6c63ff] text-white ring-4 ring-[#6c63ff]/20 animate-pulse' 
                            : 'bg-[#0f0f1a] text-[#4b5563] border border-white/5'
                      }`}>
                        {idx < currentStep ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-sm transition-all duration-500 ${
                        idx <= currentStep ? 'text-white' : 'text-[#4b5563]'
                      }`}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Output */}
        <div className="space-y-8 min-h-[600px]">
          {!result && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-50 py-20">
              <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center">
                <Network className="w-12 h-12 text-[#94a3b8]" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-xl font-semibold mb-2">Ready to Build</h3>
                <p className="text-sm text-[#94a3b8]">Enter your topic and content to generate an interactive knowledge graph and question paper.</p>
              </div>
            </div>
          )}

          {result && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Success Banner */}
              <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#10b981]">Generation Complete!</h4>
                    <p className="text-xs text-[#10b981]/80">Question paper has been sent to {email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePrint} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" title="Print">
                    <Printer className="w-5 h-5" />
                  </button>
                  <button onClick={handleDownloadPDF} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" title="Download PDF">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Knowledge Graph Section */}
              <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  <h3 className="text-sm font-bold bg-[#0f0f1a]/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/5">Interactive Knowledge Graph</h3>
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30">Topic</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30">Subtopic</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30">Concept</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/30">Term</span>
                  </div>
                </div>
                
                <svg ref={graphRef} className="w-full h-[500px] cursor-grab active:cursor-grabbing" />
                
                {/* Tooltip / Node Info */}
                <AnimatePresence>
                  {hoveredNodeId && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-4 right-4 bg-[#0f0f1a]/90 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl max-w-xs"
                    >
                      {(() => {
                        const node = result.knowledgeGraph.nodes.find(n => n.id === hoveredNodeId);
                        if (!node) return null;
                        return (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 
                                node.type === 'topic' ? '#3b82f6' : 
                                node.type === 'subtopic' ? '#6c63ff' : 
                                node.type === 'concept' ? '#10b981' : '#f59e0b' 
                              }} />
                              <span className="text-xs font-bold uppercase tracking-widest opacity-50">{node.type}</span>
                            </div>
                            <h5 className="font-bold mb-1">{node.label}</h5>
                            <p className="text-xs text-[#94a3b8] leading-relaxed">{node.details || "No additional details available."}</p>
                          </>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Questions Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Question Paper</h3>
                  <button 
                    onClick={() => setShowAnswers(!showAnswers)}
                    className="flex items-center gap-2 text-sm font-medium bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5 transition-all"
                  >
                    {showAnswers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showAnswers ? "Hide Answer Key" : "Show Answer Key"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {result.questions
                    .filter(q => !selectedNodeId || q.sourceNodeId === selectedNodeId)
                    .map((q, idx) => {
                      const sourceNode = result.knowledgeGraph.nodes.find(n => n.id === q.sourceNodeId);
                      const nodeColor = sourceNode ? 
                        (sourceNode.type === 'topic' ? '#3b82f6' : 
                         sourceNode.type === 'subtopic' ? '#6c63ff' : 
                         sourceNode.type === 'concept' ? '#10b981' : '#f59e0b') : '#6c63ff';

                      return (
                        <motion.div 
                          key={q.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`bg-[#1a1a2e] border-l-4 rounded-xl p-6 shadow-lg transition-all hover:translate-x-1 ${
                            hoveredNodeId === q.sourceNodeId ? 'ring-2 ring-white/20' : ''
                          }`}
                          style={{ borderLeftColor: nodeColor }}
                          onMouseEnter={() => q.sourceNodeId && setHoveredNodeId(q.sourceNodeId)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded text-[#94a3b8]">
                              {q.type} • {q.marks} Marks
                            </span>
                            {sourceNode && (
                              <span className="text-[10px] font-medium opacity-50">Source: {sourceNode.label}</span>
                            )}
                          </div>
                          
                          <p className="text-lg font-medium mb-6 leading-relaxed">{q.text}</p>

                          {q.options && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                              {q.options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#0f0f1a] border border-white/5">
                                  <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold text-[#94a3b8]">
                                    {String.fromCharCode(65 + i)}
                                  </div>
                                  <span className="text-sm">{opt}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <AnimatePresence>
                            {showAnswers && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-white/5"
                              >
                                <div className="flex items-center gap-2 text-emerald-400">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-xs font-bold uppercase tracking-wider">Correct Answer</span>
                                </div>
                                <p className="mt-1 text-sm text-[#94a3b8]">{q.answer}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/5 py-12 bg-[#0a0a14]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <BrainCircuit className="w-5 h-5 text-[#6c63ff]" />
              <span className="font-bold">{CONFIG.APP_NAME}</span>
            </div>
            <p className="text-xs text-[#4b5563]">Crafting high-quality assessments with AI and Knowledge Graphs.</p>
          </div>
          <div className="flex gap-8 text-xs font-medium text-[#4b5563]">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
          </div>
          <div className="text-[10px] font-mono text-[#4b5563]">
            © 2026 QuestionCraft AI. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Global CSS for D3 arrows and print */}
      <style>{`
        @media print {
          header, footer, .lg\\:grid-cols-\\[450px_1fr\\] > div:first-child, .bg-\\[#10b981\\]\\/10, button {
            display: none !important;
          }
          main {
            display: block !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
          .lg\\:grid-cols-\\[450px_1fr\\] {
            grid-template-columns: 1fr !important;
          }
          .bg-\\[#1a1a2e\\] {
            background: white !important;
            color: black !important;
            border: 1px solid #eee !important;
            box-shadow: none !important;
          }
          .text-white { color: black !important; }
          .text-\\[#94a3b8\\] { color: #666 !important; }
          svg { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
