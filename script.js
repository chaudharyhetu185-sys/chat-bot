/**
 * PULSE AI — script.js  (Fixed Version)
 * - OpenAI API integration
 * - Smart local knowledge engine
 * - Working send button & dark/light theme toggle
 */

'use strict';

/* ================================================================
   CONFIGURATION
================================================================ */
var CONFIG = {
  apiKey:      '',
  model:       'gpt-4o-mini',
  persona:     'You are Pulse, a smart and helpful AI assistant. Respond naturally, concisely, and accurately.',
  maxTokens:   800,
  temperature: 0.7,
};

function loadConfig() {
  try {
    var saved = JSON.parse(localStorage.getItem('pulse_config') || '{}');
    if (saved.apiKey)   CONFIG.apiKey   = saved.apiKey;
    if (saved.model)    CONFIG.model    = saved.model;
    if (saved.persona)  CONFIG.persona  = saved.persona;
  } catch(e) {}
}

function saveConfig() {
  localStorage.setItem('pulse_config', JSON.stringify(CONFIG));
}


/* ================================================================
   OPENAI API CALL
================================================================ */
async function callOpenAI(history) {
  var messages = [{ role: 'system', content: CONFIG.persona }].concat(history);

  var response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + CONFIG.apiKey
    },
    body: JSON.stringify({
      model:       CONFIG.model,
      messages:    messages,
      max_tokens:  CONFIG.maxTokens,
      temperature: CONFIG.temperature
    })
  });

  if (!response.ok) {
    var errData = await response.json().catch(function(){ return {}; });
    throw new Error(errData.error ? errData.error.message : 'API Error ' + response.status);
  }

  var data = await response.json();
  return data.choices[0].message.content.trim();
}


/* ================================================================
   LOCAL KNOWLEDGE ENGINE
================================================================ */
function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
}

function contains(text, keywords) {
  var t = normalize(text);
  for (var i = 0; i < keywords.length; i++) {
    if (t.indexOf(keywords[i]) !== -1) return true;
  }
  return false;
}

/* Big knowledge base with accurate answers */
var KNOWLEDGE = [

  // Greetings
  { match: ['hello','hi ','hey ','howdy','hiya','good morning','good afternoon','good evening'],
    fn: function() { return "Hello! I'm Pulse AI — your smart assistant. How can I help you today?"; }
  },

  // How are you
  { match: ['how are you','how r u','how do you do','are you okay'],
    fn: function() { return "I'm functioning perfectly, thanks for asking! Ready to help. What would you like to know?"; }
  },

  // Identity
  { match: ['who are you','what are you','your name','introduce'],
    fn: function() { return "I'm **Pulse AI** — a smart chat assistant. I can answer questions about science, math, history, programming, language, and more.\n\nFor even smarter replies, add your OpenAI API key in ⚙️ Settings."; }
  },

  // Capabilities
  { match: ['what can you do','your capabilities','how can you help','help me with'],
    fn: function() { return "I can help with:\n\n• **Science** — physics, chemistry, biology, space\n• **Mathematics** — calculations, formulas, concepts\n• **History** — world events, wars, civilizations\n• **Programming** — Python, JavaScript, HTML, CSS\n• **Geography** — countries, capitals, facts\n• **Language** — grammar, definitions, writing\n• **Economics** — inflation, GDP, finance\n• **General Q&A** — almost anything!\n\nJust ask your question!"; }
  },

  // Math (inline calculation)
  { match: ['calculate','compute','equals','result of','what is 1','what is 2','what is 3','what is 4','what is 5','what is 6','what is 7','what is 8','what is 9'],
    fn: function(q) {
      var expr = q.match(/[\d\s\+\-\*\/\.\(\)%]+/);
      if (expr) {
        try {
          var clean = expr[0].trim();
          if (clean.length > 1) {
            var result = Function('"use strict"; return (' + clean + ')')();
            if (isFinite(result)) return '**' + clean + ' = ' + parseFloat(result.toFixed(8)) + '**';
          }
        } catch(e) {}
      }
      return null;
    }
  },

  // Time
  { match: ['what time','current time','time is it','what is the time'],
    fn: function() {
      var t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
      return 'The current time on your device is **' + t + '**.';
    }
  },

  // Date
  { match: ['what date','today\'s date','what is today','what day','current date'],
    fn: function() {
      var d = new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
      return 'Today is **' + d + '**.';
    }
  },

  // Black holes
  { match: ['black hole','black holes','event horizon','singularity','hawking'],
    fn: function() { return "**How Black Holes Form:**\n\nBlack holes form when massive stars (20+ times the Sun's mass) exhaust their nuclear fuel. Without outward pressure from fusion, gravity causes the core to collapse in a supernova.\n\nIf the remaining core exceeds ~3 solar masses, it collapses into a **singularity** — a point of near-infinite density. The **event horizon** is the boundary where escape velocity exceeds light speed — nothing can escape.\n\n**Types:**\n• Stellar black holes (3–100 solar masses)\n• Supermassive (millions–billions of solar masses, found at galaxy centers)\n• Primordial (hypothetical, from the early universe)"; }
  },

  // Speed of light
  { match: ['speed of light','light speed','299792','faster than light'],
    fn: function() { return "**Speed of Light:**\n\nLight travels at **299,792,458 m/s** (~3 × 10⁸ m/s) in a vacuum, denoted as **c**.\n\n**Why it matters:**\n• Universal speed limit — nothing with mass can reach it\n• Foundation of Einstein's Special Relativity (E = mc²)\n• Light from the Sun takes 8 minutes 20 seconds to reach Earth\n• Light from Proxima Centauri (nearest star) takes 4.24 years"; }
  },

  // Machine learning vs Deep learning
  { match: ['machine learning','deep learning','neural network','ml vs dl','ai vs ml'],
    fn: function() { return "**Machine Learning vs Deep Learning:**\n\n**Machine Learning (ML):**\n• Algorithms that learn patterns from data\n• Requires manual feature extraction\n• Works well with smaller datasets\n• Examples: Decision Trees, SVM, Random Forest\n\n**Deep Learning (DL):**\n• A subset of ML using multi-layer neural networks\n• Automatically extracts features\n• Needs very large datasets and GPU power\n• Examples: CNNs (images), RNNs, Transformers (GPT)\n\n**Summary:** Deep Learning ⊂ Machine Learning ⊂ Artificial Intelligence"; }
  },

  // Photosynthesis
  { match: ['photosynthesis','how plants make','chlorophyll','chloroplast'],
    fn: function() { return "**Photosynthesis:**\n\n6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂\n\nPlants convert sunlight, carbon dioxide, and water into glucose and oxygen.\n\n**Two stages:**\n1. **Light-dependent reactions** (thylakoids): Sunlight splits water → releases O₂, produces ATP\n2. **Calvin Cycle** (stroma): CO₂ is converted to glucose using ATP\n\nChlorophyll absorbs red and blue light, reflects green — that's why leaves appear green."; }
  },

  // World War 1
  { match: ['world war 1','ww1','world war one','first world war','cause of ww'],
    fn: function() { return "**Causes of World War 1 (1914–1918):**\n\nRemembered by the acronym **MAIN:**\n\n• **M — Militarism:** Arms race between European powers\n• **A — Alliances:** Triple Alliance (Germany, Austria-Hungary, Italy) vs Triple Entente (France, Russia, Britain)\n• **I — Imperialism:** Competition over colonies created tensions\n• **N — Nationalism:** Ethnic independence movements destabilized empires\n\n**Trigger:** Assassination of Archduke Franz Ferdinand on June 28, 1914 in Sarajevo set off the alliance chain reaction."; }
  },

  // World War 2
  { match: ['world war 2','ww2','world war two','second world war','cause of ww2'],
    fn: function() { return "**Causes of World War 2 (1939–1945):**\n\n• **Treaty of Versailles (1919):** Harsh penalties on Germany caused economic crisis and resentment\n• **Rise of Fascism:** Hitler (Nazi Germany), Mussolini (Italy), militarist Japan\n• **Great Depression:** Economic collapse fueled extremism\n• **Appeasement policy:** Britain and France failed to stop Hitler's early expansions\n• **Hitler's invasion of Poland (Sept 1, 1939):** Britain and France declared war\n\n**Result:** ~70-85 million deaths, end of European colonial empires, birth of the UN, Cold War begins."; }
  },

  // Gravity
  { match: ['gravity','gravitational force','how gravity works','newton gravity','general relativity'],
    fn: function() { return "**Gravity:**\n\n**Newton's Law (1687):**\nF = G × (m₁ × m₂) / r²\nEvery object with mass attracts every other object.\n\n**Einstein's General Relativity (1915):**\nGravity is not a force but the **curvature of spacetime** caused by mass and energy. Objects follow curved paths (geodesics) through this warped spacetime.\n\n**Effects:**\n• Keeps planets in orbit around stars\n• Causes time dilation (clocks run slower in stronger gravity)\n• Responsible for black holes and galaxy formation\n• Moon's gravity causes Earth's tides"; }
  },

  // DNA
  { match: ['dna','deoxyribonucleic','chromosome','gene ','genetics','heredity','rna '],
    fn: function() { return "**DNA (Deoxyribonucleic Acid):**\n\nDNA is the molecule storing genetic instructions for all living organisms.\n\n**Structure:** Double helix — two strands of nucleotides wound together (Watson & Crick, 1953).\n\n**Base pairs:** A-T (Adenine-Thymine) | G-C (Guanine-Cytosine)\n\n**How it works:**\n1. DNA stores the genetic code in genes\n2. Transcription: DNA → mRNA\n3. Translation: mRNA → Protein (at ribosomes)\n\nHumans have ~3 billion base pairs and ~20,000 genes in 23 chromosome pairs."; }
  },

  // Python code
  { match: ['python prime','prime number python','python function prime'],
    fn: function() { return "**Python: Prime Numbers**\n\n```python\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n\ndef primes_up_to(limit):\n    return [n for n in range(2, limit + 1) if is_prime(n)]\n\nprint(primes_up_to(50))\n# Output: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]\n```"; }
  },

  // Python general
  { match: ['python'],
    fn: function(q) {
      var t = normalize(q);
      if (t.indexOf('list comprehension') !== -1 || t.indexOf('comprehension') !== -1)
        return "**Python List Comprehension:**\n\n```python\n# Syntax: [expression for item in iterable if condition]\n\nsquares = [x**2 for x in range(10)]\n# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]\n\nevens = [x for x in range(20) if x % 2 == 0]\n# [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]\n\nwords = ['hello', 'world']\nupper = [w.upper() for w in words]\n# ['HELLO', 'WORLD']\n```";
      if (t.indexOf('sort') !== -1)
        return "**Python Sorting:**\n\n```python\nmy_list = [5, 2, 8, 1, 9]\nmy_list.sort()               # in-place ascending\nmy_list.sort(reverse=True)   # descending\n\nsorted_list = sorted(my_list)  # returns new list\n\n# Sort by key\nwords = ['banana', 'apple', 'cherry']\nwords.sort(key=len)          # sort by string length\n\npeople = [{'name':'Alice','age':30},{'name':'Bob','age':25}]\npeople.sort(key=lambda x: x['age'])\n```";
      if (t.indexOf('class') !== -1 || t.indexOf('oop') !== -1)
        return "**Python OOP (Classes):**\n\n```python\nclass Animal:\n    def __init__(self, name, species):\n        self.name = name\n        self.species = species\n\n    def speak(self):\n        return f'{self.name} makes a sound.'\n\nclass Dog(Animal):\n    def speak(self):\n        return f'{self.name} says: Woof!'\n\ndog = Dog('Rex', 'Canis lupus')\nprint(dog.speak())   # Rex says: Woof!\nprint(dog.species)   # Canis lupus\n```";
      return "**Python** is a high-level, interpreted language known for clean syntax and versatility.\n\nPopular uses: Data Science, Web Dev, AI/ML, Automation, Scripting.\n\nWhat Python topic do you need? (functions, classes, file handling, list comprehensions, sorting, etc.)";
    }
  },

  // JavaScript
  { match: ['javascript','async await','arrow function','closure','promise','fetch api'],
    fn: function(q) {
      var t = normalize(q);
      if (t.indexOf('async') !== -1 || t.indexOf('await') !== -1)
        return "**Async/Await in JavaScript:**\n\n```javascript\nasync function getData(url) {\n  try {\n    const response = await fetch(url);\n    if (!response.ok) throw new Error('HTTP error: ' + response.status);\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error('Failed:', error.message);\n  }\n}\n\n// Usage\ngetData('https://api.example.com/users')\n  .then(data => console.log(data));\n```\n\nasync/await is syntactic sugar over Promises — makes async code look synchronous.";
      if (t.indexOf('arrow') !== -1)
        return "**Arrow Functions in JavaScript:**\n\n```javascript\n// Traditional\nfunction add(a, b) { return a + b; }\n\n// Arrow (concise)\nconst add = (a, b) => a + b;\n\n// With block body\nconst greet = (name) => {\n  return `Hello, ${name}!`;\n};\n\n// No parameters\nconst sayHi = () => console.log('Hi!');\n\n// In array methods\nconst nums = [1, 2, 3, 4, 5];\nconst doubled = nums.map(n => n * 2); // [2,4,6,8,10]\n```\n\nArrow functions don't have their own `this` — they inherit it from the outer scope.";
      if (t.indexOf('closure') !== -1)
        return "**Closures in JavaScript:**\n\nA closure is a function that retains access to its outer scope after the outer function returns.\n\n```javascript\nfunction makeCounter() {\n  let count = 0;\n  return function() {\n    count++;\n    return count;\n  };\n}\n\nconst counter = makeCounter();\nconsole.log(counter()); // 1\nconsole.log(counter()); // 2\nconsole.log(counter()); // 3\n```\n\nClosures are used for data privacy, event handlers, and factory functions.";
      return "**JavaScript** is the language of the web — runs in browsers and on servers (Node.js).\n\nWhat JS topic do you need help with? (async/await, closures, arrow functions, DOM manipulation, etc.)";
    }
  },

  // CSS Flexbox / Grid
  { match: ['flexbox','css flex','display flex'],
    fn: function() { return "**CSS Flexbox:**\n\n```css\n.container {\n  display: flex;\n  flex-direction: row;      /* row | column */\n  justify-content: center;  /* main axis */\n  align-items: center;      /* cross axis */\n  gap: 16px;\n  flex-wrap: wrap;\n}\n\n.item {\n  flex: 1;                  /* grow equally */\n}\n```\n\n**Common justify-content values:**\nflex-start | flex-end | center | space-between | space-around | space-evenly"; }
  },

  { match: ['css grid','display grid','grid template'],
    fn: function() { return "**CSS Grid:**\n\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr); /* 3 equal cols */\n  gap: 20px;\n}\n\n/* Responsive: auto-fill */\n.container {\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n}\n\n/* Span item across columns */\n.hero { grid-column: 1 / -1; }\n```"; }
  },

  // Capital cities
  { match: ['capital of france','capital france'],
    fn: function() { return "The capital of **France** is **Paris**."; }
  },
  { match: ['capital of japan','capital japan'],
    fn: function() { return "The capital of **Japan** is **Tokyo**."; }
  },
  { match: ['capital of germany','capital germany'],
    fn: function() { return "The capital of **Germany** is **Berlin**."; }
  },
  { match: ['capital of india','capital india'],
    fn: function() { return "The capital of **India** is **New Delhi**."; }
  },
  { match: ['capital of usa','capital of america','capital united states'],
    fn: function() { return "The capital of the **United States** is **Washington, D.C.**\n\n(Note: New York City is the largest city, but D.C. is the capital.)"; }
  },
  { match: ['capital of pakistan','capital pakistan'],
    fn: function() { return "The capital of **Pakistan** is **Islamabad**."; }
  },
  { match: ['capital of china','capital china'],
    fn: function() { return "The capital of **China** is **Beijing**."; }
  },
  { match: ['capital of uk','capital of england','capital of britain'],
    fn: function() { return "The capital of the **United Kingdom** is **London**."; }
  },
  { match: ['capital of australia'],
    fn: function() { return "The capital of **Australia** is **Canberra**.\n\n(Note: Sydney is the largest city, but Canberra is the capital.)"; }
  },
  { match: ['capital of russia'],
    fn: function() { return "The capital of **Russia** is **Moscow**."; }
  },

  // Geography facts
  { match: ['largest country','biggest country'],
    fn: function() { return "**Largest Countries by Area:**\n1. Russia — 17.1 million km²\n2. Canada — 9.98 million km²\n3. USA — 9.83 million km²\n4. China — 9.6 million km²\n5. Brazil — 8.51 million km²\n\n**By population:** China (~1.41B) and India (~1.44B) are the most populous."; }
  },
  { match: ['smallest country','tiniest country'],
    fn: function() { return "The **smallest country** in the world is **Vatican City** — just 0.44 km², located within Rome, Italy. Population: ~800 people."; }
  },
  { match: ['longest river','longest river in the world'],
    fn: function() { return "The **Nile** (Africa) at ~6,650 km is generally considered the world's longest river. The **Amazon** (South America) at ~6,400 km carries by far the most water volume."; }
  },
  { match: ['highest mountain','tallest mountain','mount everest'],
    fn: function() { return "**Mount Everest** is the world's highest mountain at **8,848.86 meters** (29,031.7 ft) above sea level. Located in the Himalayas on the Nepal–Tibet border."; }
  },

  // Inflation
  { match: ['inflation','what is inflation','how inflation works'],
    fn: function() { return "**Inflation** is the rate at which the general price level of goods and services rises over time, reducing purchasing power.\n\n**Causes:**\n• **Demand-pull:** Too much money chasing too few goods\n• **Cost-push:** Rising production costs passed to consumers\n• **Monetary:** Excessive money printing\n\n**Measured by:** Consumer Price Index (CPI)\n\n**Example:** If inflation is 5%, something that cost ₹100 last year now costs ₹105.\n\nCentral banks raise interest rates to reduce inflation."; }
  },

  // GDP
  { match: ['gdp','gross domestic product'],
    fn: function() { return "**GDP (Gross Domestic Product)** is the total monetary value of all goods and services produced in a country in a given period.\n\n**Formula:** GDP = C + I + G + (X - M)\n• C = Consumer spending\n• I = Business investment\n• G = Government spending\n• X - M = Net exports (exports minus imports)\n\nGDP growth > 0% = economic expansion\nTwo consecutive quarters of negative GDP = recession"; }
  },

  // Climate change
  { match: ['climate change','global warming','greenhouse effect','greenhouse gas'],
    fn: function() { return "**Climate Change:**\n\nLong-term shifts in global temperature and weather patterns, accelerated by human activity since the Industrial Revolution.\n\n**Greenhouse Effect:**\n1. Sunlight warms Earth's surface\n2. Earth emits infrared radiation\n3. Greenhouse gases (CO₂, CH₄, N₂O) trap this heat\n4. CO₂ levels rose from 280ppm (1800) to 420+ppm (today)\n\n**Effects:** Rising sea levels, extreme weather events, species extinction, ocean acidification\n\n**Solutions:** Renewable energy, electric vehicles, reforestation, carbon capture"; }
  },

  // Internet
  { match: ['how internet works','what is internet','how does internet'],
    fn: function() { return "**How the Internet Works:**\n\n1. **IP Address** — Every device has a unique identifier (e.g., 192.168.1.1)\n2. **DNS** — Converts domain names (google.com) to IP addresses\n3. **Data Packets** — Data is split into small packets, each routed independently\n4. **TCP/IP** — Protocols governing transmission and reassembly of packets\n5. **HTTP/HTTPS** — Protocol for loading web pages (HTTPS = encrypted)\n6. **Routers** — Direct packets across the network to their destination\n\nWhen you visit a website: Browser → DNS lookup → Server IP found → TCP connection → Page loads"; }
  },

  // Immune system
  { match: ['immune system','immunity','antibody','white blood cell','t cell','b cell'],
    fn: function() { return "**How the Human Immune System Works:**\n\n**1. Innate Immunity (fast, non-specific)**\n• Skin, mucous membranes (physical barriers)\n• Neutrophils, macrophages, natural killer cells\n• Responds within minutes\n\n**2. Adaptive Immunity (slow, specific)**\n• B cells → produce antibodies targeting specific pathogens\n• T cells → directly kill infected cells / coordinate response\n• Creates immunological memory (basis of vaccines)\n\n**Process:** Pathogen enters → Macrophages engulf it → Present antigens → T-helper cells activate B cells → Antibodies produced → Pathogen eliminated → Memory cells stored"; }
  },

  // Vaccines
  { match: ['vaccine','vaccination','how vaccines work'],
    fn: function() { return "**How Vaccines Work:**\n\n1. A harmless antigen (weakened pathogen, protein piece, or mRNA instructions) is introduced\n2. The immune system mounts a response and produces antibodies\n3. Memory B and T cells are created\n4. Future exposure → rapid immune response → disease prevented\n\n**Types:**\n• Live-attenuated (MMR, chickenpox)\n• Inactivated (flu shot, polio)\n• Subunit/protein (Hepatitis B, HPV)\n• mRNA (COVID-19 Pfizer/Moderna)"; }
  },

  // Evolution
  { match: ['evolution','natural selection','darwin','how evolution works'],
    fn: function() { return "**Theory of Evolution (Darwin, 1859):**\n\nSpecies change over generations through **natural selection:**\n\n1. **Variation** — individuals differ in traits\n2. **Heredity** — traits pass to offspring via DNA\n3. **Selection pressure** — environment favors certain traits\n4. **Differential survival** — better-adapted individuals reproduce more\n\nOver many generations, beneficial traits become more common → species change.\n\n**Evidence:** Fossil record, comparative anatomy, DNA similarities, observed speciation (e.g., antibiotic resistance in bacteria)"; }
  },

  // Blockchain/Bitcoin
  { match: ['bitcoin','blockchain','cryptocurrency','crypto','what is bitcoin'],
    fn: function() { return "**Bitcoin & Blockchain:**\n\n**Blockchain** is a distributed, immutable ledger — a chain of blocks containing verified transaction records with no central authority.\n\n**Bitcoin (2009)** — first cryptocurrency, created by pseudonymous Satoshi Nakamoto:\n• **Decentralized** — no bank or government controls it\n• **Limited supply** — max 21 million BTC ever\n• **Proof of Work** — miners solve complex math to validate transactions\n• **Transparent** — all transactions visible on public blockchain\n\n1 BTC = 100,000,000 satoshis (smallest unit)"; }
  },

  // Meaning of life
  { match: ['meaning of life','purpose of life','why do we exist'],
    fn: function() { return "**The Meaning of Life — Key Views:**\n\n• **Aristotle:** Eudaimonia — human flourishing through virtue and reason\n• **Existentialism (Sartre):** We create our own meaning; life has no inherent purpose\n• **Absurdism (Camus):** Life is meaningless but we must embrace it and rebel against the absurd\n• **Buddhism:** End suffering through non-attachment and the Eightfold Path\n• **Utilitarianism:** Maximize happiness for the greatest number\n• **Religion:** Purpose given by God/divine will\n\nPhilosophy gives no single answer — the question itself is the journey."; }
  },

  // Affect vs Effect
  { match: ['affect vs effect','affect or effect','difference between affect and effect'],
    fn: function() { return "**Affect vs Effect:**\n\n• **Affect** (usually a verb) — to influence\n  Example: *The rain affected my mood.*\n\n• **Effect** (usually a noun) — the result\n  Example: *The effect of the rain was a flooded road.*\n\n**Memory trick:** A for Action (affect = verb) | E for End result (effect = noun)"; }
  },

  // Their/There/They're
  { match: ["their vs there","there vs their","their there they're"],
    fn: function() { return "**Their / There / They're:**\n\n• **Their** — possessive: *It's their car.*\n• **There** — a place: *Put it over there.*\n• **They're** — contraction of 'they are': *They're coming tomorrow.*\n\n**Trick:** They're = They are | There has 'here' in it | Their has 'heir' (ownership)"; }
  },

  // Thanks
  { match: ['thank you','thanks','thank u','thx','ty '],
    fn: function() { return "You're welcome! Happy to help. Is there anything else you'd like to know?"; }
  },

  // Goodbye
  { match: ['bye','goodbye','see you','take care','good night','goodnight','farewell'],
    fn: function() { return "Goodbye! Feel free to come back whenever you have questions. Take care!"; }
  },
];

/* Run the local engine */
function runLocalEngine(userInput) {
  var q = userInput;
  var t = normalize(q);

  for (var i = 0; i < KNOWLEDGE.length; i++) {
    var entry = KNOWLEDGE[i];
    for (var j = 0; j < entry.match.length; j++) {
      if (t.indexOf(entry.match[j]) !== -1) {
        var result = entry.fn(q);
        if (result) return result;
      }
    }
  }

  // Check if it's a math expression
  var mathMatch = t.match(/^[\d\s\+\-\*\/\.\(\)%\^]+$/);
  if (mathMatch) {
    try {
      var expr = t.replace(/\^/g, '**');
      var ans = Function('"use strict"; return (' + expr + ')')();
      if (isFinite(ans)) return '**' + t + ' = ' + parseFloat(ans.toFixed(8)) + '**';
    } catch(e) {}
  }

  return null;
}

function gracefulFallback(userMsg) {
  var isQ = /^(what|who|where|when|why|how|is|are|was|were|can|could|explain|define|tell)/i.test(userMsg.trim());
  if (isQ) {
    return "I want to give you an accurate answer, but this topic isn't in my local knowledge base.\n\nFor a complete AI-generated answer:\n1. Click **⚙️ Settings** (top right)\n2. Paste your **OpenAI API key**\n3. Ask again — I'll use GPT!\n\nOr try asking about: science, math, history, programming, geography, or grammar.";
  }
  return "I'm not quite sure how to respond to that. Could you ask a specific question? I'm great at science, coding, history, math, and much more!";
}


/* ================================================================
   STATE
================================================================ */
var appState = {
  history:  [],
  isDark:   false,
  busy:     false,
  started:  false,
};

function addHistory(role, content) {
  appState.history.push({ role: role, content: content });
  if (appState.history.length > 40) appState.history = appState.history.slice(-40);
}


/* ================================================================
   MARKDOWN RENDERER (simple, safe)
================================================================ */
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function renderMd(text) {
  // Code blocks first
  text = text.replace(/```[\w]*\n?([\s\S]*?)```/g, function(_, code) {
    return '<pre><code>' + escHtml(code.trim()) + '</code></pre>';
  });
  // Inline code
  text = text.replace(/`([^`\n]+)`/g, function(_, c) {
    return '<code>' + escHtml(c) + '</code>';
  });
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Headings
  text = text.replace(/^### (.+)$/gm, '<strong style="display:block;margin:6px 0 2px;">$1</strong>');
  // Bullet lists
  text = text.replace(/^[•\-\*] (.+)$/gm, '<div style="padding:2px 0 2px 14px;">• $1</div>');
  // Numbered lists
  text = text.replace(/^(\d+)\. (.+)$/gm, '<div style="padding:2px 0 2px 14px;">$1. $2</div>');
  // Line breaks
  text = text.replace(/\n/g, '<br>');
  return text;
}


/* ================================================================
   DOM HELPERS
================================================================ */
function el(id) { return document.getElementById(id); }

var D = {};

function initDom() {
  D.chatArea        = el('chatArea');
  D.msgList         = el('msgList');
  D.emptyState      = el('emptyState');
  D.typingWrap      = el('typingWrap');
  D.msgInput        = el('msgInput');
  D.sendBtn         = el('sendBtn');
  D.charCount       = el('charCount');
  D.clearBtn        = el('clearBtn');
  D.themeBtn        = el('themeBtn');
  D.settingsBtn     = el('settingsBtn');
  D.settingsPanel   = el('settingsPanel');
  D.settingsOverlay = el('settingsOverlay');
  D.closeSettings   = el('closeSettings');
  D.apiKeyInput     = el('apiKeyInput');
  D.toggleKey       = el('toggleKey');
  D.modelSelect     = el('modelSelect');
  D.personaInput    = el('personaInput');
  D.saveSettings    = el('saveSettings');
  D.saveStatus      = el('saveStatus');
  D.apiBadge        = el('apiBadge');
  D.badgeLabel      = el('badgeLabel');
  D.statusText      = el('statusText');
  D.starterGrid     = el('starterGrid');
}

function scrollBottom() {
  if (D.chatArea) D.chatArea.scrollTop = D.chatArea.scrollHeight;
}

function setTyping(on) {
  if (!D.typingWrap) return;
  if (on) {
    D.typingWrap.classList.remove('hidden');
    if (D.statusText) D.statusText.textContent = 'Typing\u2026';
  } else {
    D.typingWrap.classList.add('hidden');
    if (D.statusText) D.statusText.textContent = 'Smart Assistant \u00b7 Online';
  }
  scrollBottom();
}

function updateBadge() {
  if (!D.apiBadge || !D.badgeLabel) return;
  if (CONFIG.apiKey) {
    D.apiBadge.className = 'api-badge gpt';
    D.badgeLabel.textContent = CONFIG.model.toUpperCase();
  } else {
    D.apiBadge.className = 'api-badge';
    D.badgeLabel.textContent = 'Smart Engine';
  }
}

var dateSepAdded = false;
function addDateSep() {
  if (dateSepAdded) return;
  dateSepAdded = true;
  var sep = document.createElement('div');
  sep.className = 'date-sep';
  sep.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric'
  });
  D.msgList.appendChild(sep);
}

function hideWelcome() {
  if (appState.started) return;
  appState.started = true;
  if (D.emptyState) {
    D.emptyState.style.opacity = '0';
    D.emptyState.style.transform = 'translateY(-10px)';
    D.emptyState.style.transition = 'opacity 0.25s,transform 0.25s';
    setTimeout(function() {
      D.emptyState.classList.add('hidden');
    }, 250);
  }
}

function appendMsg(text, role, engine) {
  var isUser = role === 'user';
  var row = document.createElement('div');
  row.className = 'msg-row ' + role;

  var ts = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  var engineTag = engine ? '<span class="engine-tag">' + escHtml(engine) + '</span>' : '';
  var bubbleContent = isUser ? escHtml(text) : renderMd(text);

  row.innerHTML =
    '<div class="m-avatar ' + role + '">' + (isUser ? 'U' : 'P') + '</div>' +
    '<div class="msg-group">' +
      '<div class="msg-label">' + (isUser ? 'You' : 'Pulse AI') + '</div>' +
      '<div class="bubble ' + role + '">' + bubbleContent + '</div>' +
      '<div class="msg-meta">' +
        '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
        ' ' + ts + ' ' + engineTag +
      '</div>' +
    '</div>';

  D.msgList.appendChild(row);
  scrollBottom();
}

function appendError(text) {
  var row = document.createElement('div');
  row.className = 'msg-row bot';
  row.innerHTML =
    '<div class="m-avatar bot">P</div>' +
    '<div class="msg-group">' +
      '<div class="msg-label">Pulse AI</div>' +
      '<div class="bubble bot error">\u26a0\ufe0f ' + escHtml(text) + '</div>' +
    '</div>';
  D.msgList.appendChild(row);
  scrollBottom();
}


/* ================================================================
   SEND MESSAGE
================================================================ */
async function sendMessage(text) {
  var msg = text.trim();
  if (!msg || appState.busy) return;

  appState.busy = true;
  hideWelcome();
  addDateSep();

  appendMsg(msg, 'user', '');
  addHistory('user', msg);

  D.msgInput.value = '';
  D.msgInput.style.height = 'auto';
  if (D.charCount) D.charCount.textContent = '';
  D.sendBtn.disabled = true;

  setTyping(true);

  var reply = '';
  var engine = '';
  var startTime = Date.now();

  try {
    if (CONFIG.apiKey) {
      reply  = await callOpenAI(appState.history);
      engine = CONFIG.model;
    } else {
      // Simulate typing delay for realism
      var minWait = 600 + Math.min(msg.length * 10, 1500);
      await new Promise(function(res) { setTimeout(res, minWait); });

      var local = runLocalEngine(msg);
      reply  = local || gracefulFallback(msg);
      engine = 'Smart Engine';
    }
  } catch(err) {
    setTyping(false);
    appendError('Could not get response: ' + err.message);
    appState.busy = false;
    return;
  }

  // Ensure minimum display time for typing indicator
  var elapsed = Date.now() - startTime;
  if (elapsed < 500) {
    await new Promise(function(res) { setTimeout(res, 500 - elapsed); });
  }

  setTyping(false);
  appendMsg(reply, 'bot', engine);
  addHistory('assistant', reply);
  appState.busy = false;
}


/* ================================================================
   THEME TOGGLE
================================================================ */
var MOON_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
var SUN_SVG  = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';

function toggleTheme() {
  appState.isDark = !appState.isDark;
  document.documentElement.setAttribute('data-theme', appState.isDark ? 'dark' : 'light');
  D.themeBtn.innerHTML = appState.isDark ? SUN_SVG : MOON_SVG;
  localStorage.setItem('pulse_theme', appState.isDark ? 'dark' : 'light');
}

function loadTheme() {
  var saved = localStorage.getItem('pulse_theme');
  if (saved === 'dark') {
    appState.isDark = true;
    document.documentElement.setAttribute('data-theme', 'dark');
    if (D.themeBtn) D.themeBtn.innerHTML = SUN_SVG;
  }
}


/* ================================================================
   SETTINGS
================================================================ */
function openSettings() {
  D.apiKeyInput.value  = CONFIG.apiKey;
  D.modelSelect.value  = CONFIG.model;
  D.personaInput.value = CONFIG.persona;
  D.saveStatus.textContent = '';
  D.settingsPanel.classList.remove('hidden');
  D.settingsOverlay.classList.remove('hidden');
}

function closeSettingsPanel() {
  D.settingsPanel.classList.add('hidden');
  D.settingsOverlay.classList.add('hidden');
}

function saveSettingsFn() {
  CONFIG.apiKey  = D.apiKeyInput.value.trim();
  CONFIG.model   = D.modelSelect.value;
  CONFIG.persona = D.personaInput.value.trim() || CONFIG.persona;
  saveConfig();
  updateBadge();
  D.saveStatus.textContent = '\u2713 Saved!';
  setTimeout(closeSettingsPanel, 1000);
}


/* ================================================================
   AUTO-RESIZE TEXTAREA + ENABLE SEND BTN
================================================================ */
function handleInput() {
  // Auto-resize
  D.msgInput.style.height = 'auto';
  D.msgInput.style.height = Math.min(D.msgInput.scrollHeight, 130) + 'px';

  // Update char count
  var len = D.msgInput.value.length;
  if (D.charCount) D.charCount.textContent = len > 0 ? len : '';

  // Enable/disable send button
  var hasText = D.msgInput.value.trim().length > 0;
  D.sendBtn.disabled = !hasText || appState.busy;
}


/* ================================================================
   CLEAR CHAT
================================================================ */
function clearChat() {
  appState.history  = [];
  appState.started  = false;
  dateSepAdded      = false;
  appState.busy     = false;
  D.msgList.innerHTML = '';
  setTyping(false);
  if (D.emptyState) {
    D.emptyState.classList.remove('hidden');
    D.emptyState.style.opacity   = '1';
    D.emptyState.style.transform = 'none';
  }
  D.sendBtn.disabled = true;
  D.msgInput.focus();
}


/* ================================================================
   INIT — wire everything up
================================================================ */
function init() {
  initDom();
  loadConfig();
  loadTheme();
  updateBadge();

  // ── Input field ──
  D.msgInput.addEventListener('input',   handleInput);
  D.msgInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!D.sendBtn.disabled) sendMessage(D.msgInput.value);
    }
  });

  // ── Send button ──
  D.sendBtn.addEventListener('click', function() {
    sendMessage(D.msgInput.value);
  });

  // ── Theme button ──
  D.themeBtn.addEventListener('click', toggleTheme);

  // ── Clear button ──
  D.clearBtn.addEventListener('click', clearChat);

  // ── Settings ──
  D.settingsBtn.addEventListener('click', openSettings);
  D.closeSettings.addEventListener('click', closeSettingsPanel);
  D.settingsOverlay.addEventListener('click', closeSettingsPanel);
  D.saveSettings.addEventListener('click', saveSettingsFn);

  // ── Show/hide API key ──
  D.toggleKey.addEventListener('click', function() {
    D.apiKeyInput.type = D.apiKeyInput.type === 'password' ? 'text' : 'password';
  });

  // ── Starter questions ──
  D.starterGrid.addEventListener('click', function(e) {
    var btn = e.target.closest('.starter');
    if (btn) sendMessage(btn.getAttribute('data-q'));
  });

  // Focus input
  D.msgInput.focus();
}

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', init);
