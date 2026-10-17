import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Volume2, VolumeX, X } from "lucide-react";
import { API_BASE_URL, getPosts } from "../../services/api";
import { getArticleUrl } from "../../utils/slug";
import { useLanguage } from "../../context/LanguageContext";
import websiteLogo from "../../Rubavu.jpeg";

const MAX_POSTS = 200;



const VOICE_REPLY_STORAGE_KEY = "voiceReply";

const readStoredFlag = (key) => {
    try {
        return window.localStorage.getItem(key) === "1";
    } catch {
        return false;
    }
};

/* Match a read-aloud voice to the selected language, preferring natural
   sounding voices when several are installed in the browser. */
const pickVoice = (voices, language) => {
    if (!Array.isArray(voices) || !voices.length) return null;

    const prefixes = language === "rw" ? ["rw", "sw", "en"] : [language, "en"];

    const score = (voice) => {
        const lang = String(voice.lang || "").toLowerCase();
        const name = String(voice.name || "").toLowerCase();
        const prefixIndex = prefixes.findIndex((prefix) => lang.startsWith(prefix));

        if (prefixIndex === -1) return -1;

        let value = (prefixes.length - prefixIndex) * 10;
        if (/natural|neural|premium|enhanced|siri/.test(name)) value += 6;
        if (/google/.test(name)) value += 4;
        if (voice.localService) value += 1;
        if (voice.default) value += 1;
        return value;
    };

    return [...voices]
        .map((voice) => ({ voice, value: score(voice) }))
        .filter((entry) => entry.value >= 0)
        .sort((a, b) => b.value - a.value)[0]?.voice || null;
};

/* Strip bullet/check glyphs so the read-aloud voice stays natural. */
const speakableText = (value) =>
    String(value || "")
        .replace(/[•✓*_#]/g, " ")
        .replace(/\s+/g, " ")
        .trim();


const cleanText = (value) => String(value || "").trim();

const postTitle = (post) => cleanText(post?.title) || "Inkuru ya Rubavu Today";

const postHref = (post) => getArticleUrl(post);

const normalize = (value) =>
    cleanText(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const getDate = (post) => {
    const value = post?.createdDate || post?.created_at || post?.createdAt;
    const date = value ? new Date(value) : null;

    return date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString("rw-RW", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
        : "";
};

const getTime = (post) => {
    const value = post?.createdDate || post?.created_at || post?.createdAt;
    const time = value ? new Date(value).getTime() : 0;

    return Number.isNaN(time) ? 0 : time;
};

const findPosts = (posts, question) => {
    const terms = normalize(question)
        .split(/\s+/)
        .filter((term) => term.length > 2);

    if (!terms.length) return [];

    return posts
        .map((post) => {
            const haystack = normalize(
                Object.entries(post || {})
                    .filter(([key]) => !["image", "id", "_id"].includes(key))
                    .map(([, value]) => typeof value === "object" ? JSON.stringify(value) : value)
                    .join(" ")
            );
            const score = terms.reduce(
                (total, term) => total + (haystack.includes(term) ? 1 : 0),
                0
            );

            return { post, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ post }) => post);
};

const detectLanguage = () => "rw";

const detectSentiment = (text) => {
    const negative = /ne|ntabwo|nta|siyo|ntera|tera|ubwoba|agaciro|cane|cyane|bibi|impi|ibibazo|icyo kibabaje|ntabuke|amakubire|ubwiyunge/i;
    const positive = /yego|neza|cyiza|kuryama|agaciro|agahinda|mwiza|mahoro|agasigaye|mwacu|mwacu cyane|numva neza|ijoro cyiza|neza cyane/i;

    if (negative.test(text)) return "concerned";
    if (positive.test(text)) return "happy";
    return "neutral";
};

const localized = {
    rw: {
        welcome: "Muraho ubwacu! 👋 Ndi Rubavu Today Assistant, umufasha wacu mu gushakisha amakuru n'ubwenge. Kandi woza maze wabaza ibibazo byacu. Ndi imvano kumweka ushaka kandi nzafasha.",
        greeting: "Muraho cyane! 😊 Niweze kumukweka amakuru mashya n'agapitiye cyane. Andi kundi nshobora kugufasha gushakisha inkuru runaka.",
        greetingHappy: "Ijoro cyiza cyane! 🌟 Nitwiyunge ari amakuru mashya yo muri Rubavu n'ahandi hose. Ndi hano kugufasha wacu mu mafaranga n'amakuru.",
        greetingConcerned: "Muramutse neza! 💙 Ntakibabaje, nshobora kugufasha kumenya ibyose ushaka. Nimugukoreshera imikorere y'urubuga.",
        about: "Rubavu Today ni urubuga rw'amakuru rwimbitse n'ibwishiki. Ruzigira inzira ishya y'amakuru yo muri Rubavu n'ibice biyegereye. Hano urubuga, hari ibyiciro bitanu: Amakuru (ibyiciro by'ibanze), Ubukungu (amakuru y'imari n'ubwigenge), Imikino (amakuru y'umukino n'imitwe), Imyidagaduro (ikinema, muzika, n'indi bikinema) n'Uburezi (amakuru y'ikiyigira). Urubuga rwacu rufasha abantu kumenya ibyo bivugurura mu gihugu n'inyenzi.",
        thanks: "Mwacu cyane! 🙏 Ndi hano igihe cyose kugufasha n'uko ikintu cyose nzakwera. Aho niba ufite umuntu wa Rubavu cyangwa andi, nzagushakira amakuru neza.",
        help: "Ndi hano kugufasha na imikorere yose y'urubuga:\n✓ Guherereza amakuru mashya cyane\n✓ Gushakisha inkuru runaka ushaka\n✓ Kubazirizira ibyiciro byote\n✓ Kubisobanura uburyo bwo kwiyigira Rubavu Today\n✓ Gukoresha akazu ka Shakisha\n✓ Kubaza ibibazo byo hafi cyangwa kure",
        categories: (items) => `Ibyiciro byose byari kuri Rubavu Today: ${items.join(", ")}. Umuntu ushobora gushakisha mu buri gihe.`,
        latest: (items) => `Iyi ni amakuru agezeho ubwambere:\n${items.map((item) => `• ${item}`).join("\n")}\n\nNiba ushaka kugarura ingeri, ndakagusabyira.`,
        search: "Gukoresha akazu ka Shakisha cyangwa wandike umutwe w'inkuru ushaka kubona. Niba nta makuru aho, ndizafasha kugushakisha mu myanya yose.",
        matches: "Nabonye izi nkuru zijyanye neza n'ibyo wanditse:\n",
        empty: "Ntabwo nabonye inkuru ihuriye neza n'ibyakoze. Ariko nshobora kubajyamuvuga mu ibwambere - Amakuru agezweho, Ubukungu, Imikino, Imyidagaduro cyangwa Uburezi. Andi ushakire neza ku muntu runaka cyangwa ingingo runaka.",
        unavailable: "Ahubwo nta makuru abonetse ubu, nkoramo kubanja mugihe. Ongera ugerageze nyuma. Rubavu Today ninzira nziza yo kumenya ibyo bivugurura.",
        confused: "Sinshoboye kubyumva neza icyo uvuze! 🤔 Mushobora kugerageza neza na magambo atandukanye? Ariko nagufasha gushakisha cyangwa kukubariza amakuru mashya.",
        encourage: "Bakire! 💪 Urubuga rwacu ruzibuka neza kandi ruzigira ibyinshi. Ongera ugerageze neza! Urubuga rwacu inzira nziza yo gusobanukiranya byose.",
    },
    en: {
        welcome: "Hello! I'm the Rubavu Today assistant. 👋 Ask about the latest news, categories, or find a specific article.",
        greeting: "Hello! 😊 I can show you the latest news or help you find an article.",
        greetingHappy: "Great to see you! 🌟 I'm here to keep you updated with news from Rubavu.",
        greetingConcerned: "Hi there! 💙 I can help you find information about what you're looking for.",
        about: "Rubavu Today is a news website covering Rubavu and surrounding communities. It includes News, Business, Sports, Entertainment, and Education departments.",
        thanks: "Happy to help! 🙏 I'm always here for you.",
        help: "I can help you with:\n✓ Show the latest news\n✓ Search for specific articles\n✓ Explain news categories\n✓ Guide you through the website",
        categories: (items) => `Rubavu Today categories include: ${items.join(", ")}.`,
        latest: (items) => `The latest news is:\n${items.map((item) => `• ${item}`).join("\n")}`,
        search: "Use the search box or type the title or subject of the article you want.",
        matches: "I found these articles related to your question:",
        empty: "I could not find an exact article match yet. I can help with the latest news, Business, Sports, Entertainment, Education, or any topic published on Rubavu Today. Try an article title, person, or subject.",
        unavailable: "No news is available right now. Please try again later.",
        confused: "I'm not quite sure! 🤔 Could you rephrase your question? I can help with searching or showing you our latest news.",
        encourage: "Keep exploring! 💪 Our website has lots of great content. Try again!",
    },
    fr: {
        welcome: "Bonjour ! Je suis l'assistant de Rubavu Today. 👋 Demandez les dernières nouvelles, les rubriques ou un article précis.",
        greeting: "Bonjour ! 😊 Je peux vous montrer les dernières nouvelles ou vous aider à trouver un article.",
        greetingHappy: "Ravi de vous voir! 🌟 Je suis ici pour vous tenir informé des nouvelles de Rubavu.",
        greetingConcerned: "Bonjour! 💙 Je peux vous aider à trouver l'information que vous recherchez.",
        about: "Rubavu Today est un site d'actualités consacré à Rubavu et aux communautés voisines. Il propose les rubriques actualités, économie, sport, divertissement et éducation.",
        thanks: "Heureux de pouvoir aider! 🙏 Je suis toujours là pour vous.",
        help: "Je peux vous aider avec:\n✓ Afficher les dernières nouvelles\n✓ Rechercher des articles spécifiques\n✓ Expliquer les catégories\n✓ Vous guider sur le site",
        categories: (items) => `Les rubriques de Rubavu Today sont : ${items.join(", ")}.`,
        latest: (items) => `Les dernières nouvelles sont :\n${items.map((item) => `• ${item}`).join("\n")}`,
        search: "Utilisez la recherche ou écrivez le titre ou le sujet de l'article recherché.",
        matches: "Voici les articles liés à votre question :",
        empty: "Je n'ai pas trouvé d'article correspondant exactement. Je peux vous aider avec les actualités, l'économie, le sport, le divertissement ou l'éducation. Essayez un titre, un nom ou un sujet.",
        unavailable: "Aucune nouvelle n'est disponible pour le moment. Réessayez plus tard.",
        confused: "Je ne suis pas certain! 🤔 Pouviez-vous reformuler votre question? Je peux vous aider à chercher.",
        encourage: "Continuez votre exploration! 💪 Notre site propose d'excellents contenus. Réessayez!",
    },
    sw: {
        welcome: "Habari! 👋 Mimi ni msaidizi wa Rubavu Today. Uliza kuhusu habari mpya, kategoria, au tafuta makala.",
        greeting: "Habari! 😊 Ninaweza kukuonyesha habari mpya au kukusaidia kupata makala.",
        greetingHappy: "Karibu sana! 🌟 Niko hapa kukukabari habari za Rubavu.",
        greetingConcerned: "Jambo! 💙 Niweza kukusaidia kupata taarifa unayotaka.",
        about: "Rubavu Today ni tovuti ya habari kuhusu Rubavu na jamii zinazozunguka. Ina habari, biashara, michezo, burudani na elimu.",
        thanks: "Furaha ya kusaidia! 🙏 Niko hapa kila wakati.",
        help: "Niweza kukusaidia na:\n✓ Kuonyesha habari mpya\n✓ Kutafuta makala mahsusi\n✓ Kueleza kategoria\n✓ Kukuongoza kwenye tovuti",
        categories: (items) => `Kategoria za Rubavu Today ni: ${items.join(", ")}.`,
        latest: (items) => `Habari mpya ni:\n${items.map((item) => `• ${item}`).join("\n")}`,
        search: "Tumia kisanduku cha kutafuta au andika kichwa cha makala unayotaka.",
        matches: "Nimepata makala hizi zinazohusiana na swali lako:",
        empty: "Sikupata makala inayolingana kabisa. Ninaweza kusaidia kuhusu habari mpya, biashara, michezo, burudani au elimu. Andika kichwa, jina au mada.",
        unavailable: "Hakuna habari kwa sasa. Tafadhali jaribu tena baadaye.",
        confused: "Sijafaulu kuelewa! 🤔 Tafadhali uzunguke swali? Niweza kusaidia kuipatia.",
        encourage: "Endelea kutafuta! 💪 Tovuti yetu ina maudhui mazuri. Jaribu tena!",
    },
    es: {
        welcome: "¡Hola! 👋 Soy el asistente de Rubavu Today. Pregunta por las últimas noticias, categorías o un artículo.",
        greeting: "¡Hola! 😊 Puedo mostrarte las últimas noticias o ayudarte a encontrar un artículo.",
        greetingHappy: "¡Qué gusto verte! 🌟 Estoy aquí para mantenerte informado sobre Rubavu.",
        greetingConcerned: "¡Hola! 💙 Puedo ayudarte a encontrar la información que buscas.",
        about: "Rubavu Today es un sitio de noticias sobre Rubavu y las comunidades cercanas. Incluye noticias, negocios, deportes, entretenimiento y educación.",
        thanks: "¡Feliz de ayudar! 🙏 Siempre estoy aquí para ti.",
        help: "Puedo ayudarte con:\n✓ Mostrar las últimas noticias\n✓ Buscar artículos específicos\n✓ Explicar las categorías\n✓ Guiarte por el sitio",
        categories: (items) => `Las categorías de Rubavu Today son: ${items.join(", ")}.`,
        latest: (items) => `Las últimas noticias son:\n${items.map((item) => `• ${item}`).join("\n")}`,
        search: "Usa el buscador o escribe el título o tema del artículo que buscas.",
        matches: "Encontré estos artículos relacionados con tu pregunta:",
        empty: "No encontré un artículo exacto. Puedo ayudarte con noticias, negocios, deportes, entretenimiento o educación. Prueba con un título, nombre o tema.",
        unavailable: "No hay noticias disponibles ahora. Inténtalo más tarde.",
        confused: "¡No estoy muy seguro! 🤔 ¿Podrías reformular tu pregunta? Puedo ayudarte a buscar.",
        encourage: "¡Sigue explorando! 💪 Nuestro sitio tiene contenido excelente. ¡Inténtalo de nuevo!",
    },
    pt: {
        welcome: "Olá! 👋 Sou o assistente do Rubavu Today. Pergunte pelas notícias, categorias ou por um artigo.",
        greeting: "Olá! 😊 Posso mostrar as notícias recentes ou ajudar a encontrar um artigo.",
        greetingHappy: "Que bom te ver! 🌟 Estou aqui para te manter informado sobre notícias de Rubavu.",
        greetingConcerned: "Olá! 💙 Posso ajudá-lo a encontrar a informação que procura.",
        about: "Rubavu Today é um site de notícias sobre Rubavu e as comunidades próximas. Inclui notícias, negócios, desporto, entretenimento e educação.",
        thanks: "Feliz em ajudar! 🙏 Sempre estou aqui para você.",
        help: "Posso ajudar com:\n✓ Mostrar as notícias recentes\n✓ Procurar artigos específicos\n✓ Explicar as categorias\n✓ Orientá-lo no site",
        categories: (items) => `As categorias do Rubavu Today são: ${items.join(", ")}.`,
        latest: (items) => `As notícias recentes são:\n${items.map((item) => `• ${item}`).join("\n")}`,
        search: "Use a pesquisa ou escreva o título ou assunto do artigo que procura.",
        matches: "Encontrei estes artigos relacionados à sua pergunta:",
        empty: "Não encontrei um artigo exato. Posso ajudar com notícias, negócios, desporto, entretenimento ou educação. Tente um título, nome ou assunto.",
        unavailable: "Não há notícias disponíveis agora. Tente novamente mais tarde.",
        confused: "Não tenho certeza! 🤔 Poderia reformular sua pergunta? Posso ajudá-lo a procurar.",
        encourage: "Continue explorando! 💪 Nosso site tem excelente conteúdo. Tente novamente!",
    },
};

const answerQuestion = (question, posts) => {
    const normalizedQuestion = normalize(question);
    const language = detectLanguage(question);
    const copy = localized[language] || localized.en;
    const latestPosts = [...posts]
        .sort((a, b) => getTime(b) - getTime(a))
        .slice(0, 3);
    const categories = [...new Set(posts.map((post) => cleanText(post.category)).filter(Boolean))];
    const matchedPosts = findPosts(posts, question);
    const sentiment = detectSentiment(question);

    if (!normalizedQuestion) {
        return { text: copy.welcome };
    }

    // Sentiment-aware greeting with enhanced Kinyarwanda patterns
    if (/muraho|mwaramutse|muramutse|mwacu|hello|hi|bonjour|hola|habari|amakuru yawe|thanks|merci|gracias|asante|obrigado|mwacu kandi/.test(normalizedQuestion)) {
        if (/thanks|merci|gracias|asante|obrigado|mwacu kandi|mwacu/.test(normalizedQuestion)) {
            return { text: copy.thanks };
        }
        const greetingKey = sentiment === "happy" ? "greetingHappy" : sentiment === "concerned" ? "greetingConcerned" : "greeting";
        return { text: copy[greetingKey] || copy.greeting };
    }

    if (/rubavu today|website|urubuga|site|about|iki ikora|what do you do|que fait|que es|ayoboye|funga umufasha|ni iki/.test(normalizedQuestion)) {
        return { text: copy.about };
    }

    if (/help|ndihanje|huluda|gufasha|aide|ayuda|kusaidia|ushobora kugufasha/.test(normalizedQuestion)) {
        return { text: copy.help };
    }

    if (/category|categories|ibyiciro|sections|igice|kategoria|rubrique|byiciro/.test(normalizedQuestion)) {
        return { text: categories.length ? copy.categories(categories) : copy.unavailable };
    }

    if (/latest|new|mashya|agezweho|uyu munsi|amakuru|nouvelles|noticias|leo|habari mpya|agezeho/.test(normalizedQuestion) && !matchedPosts.length) {
        return { text: latestPosts.length ? copy.latest(latestPosts.map((post) => postTitle(post))) : copy.unavailable, posts: latestPosts };
    }

    if (/search|shaka|ndashaka|find|chercher|buscar|procurar|tafuta|kubona|shakisha/.test(normalizedQuestion)) {
        return { text: copy.search, posts: matchedPosts };
    }

    if (matchedPosts.length) {
        return { text: `${copy.matches}\n${matchedPosts.map((post) => `• ${postTitle(post)}${getDate(post) ? ` (${getDate(post)})` : ""}`).join("\n")}`, posts: matchedPosts };
    }

    // If no specific match but question is too short or unclear
    if (normalizedQuestion.split(/\s+/).length < 2) {
        return { text: copy.confused };
    }

    return { text: copy.empty };
};

const MessageBubble = ({ message, onPostClick }) => {
    const hasSources = message.sources?.length > 0 || message.posts?.length > 0;
    const sources = message.sources || message.posts || [];

    return (
        <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${message.role === "user"
                    ? "rounded-br-sm bg-red-600 text-white"
                    : "rounded-bl-sm bg-slate-100 text-slate-800"
                    }`}
            >
                <p className="whitespace-pre-line">{message.text}</p>
                {hasSources && (
                    <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Inkomoko / Sources
                        </p>
                        {sources.map((source, index) => (
                            <button
                                key={source.id || source._id || index}
                                type="button"
                                onClick={() => onPostClick(source)}
                                className="flex w-full flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left transition hover:border-red-400 hover:bg-red-50"
                            >
                                <span className="text-xs font-bold text-red-700">
                                    {source.title || postTitle(source)}
                                </span>
                                {(source.date || source.category) && (
                                    <span className="text-[10px] text-slate-500">
                                        {[source.category, source.date].filter(Boolean).join(" • ")}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function WebsiteChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [question, setQuestion] = useState("");
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: "welcome",
            role: "assistant",
            text: "Muraho! Ndi umufasha wa Rubavu Today. Wabaza amakuru mashya cyangwa ugashaka inkuru runaka.",
        },
    ]);
    const messagesEndRef = useRef(null);
    const { language } = useLanguage();
    const [voiceReply, setVoiceReply] = useState(() => readStoredFlag(VOICE_REPLY_STORAGE_KEY));
    const spokenRef = useRef(null);

    const speechSupported =
        typeof window !== "undefined" && "speechSynthesis" in window;

    /* Read the assistant's newest answer out loud when voice replies are on. */
    const speak = useCallback(
        (text) => {
            if (!speechSupported) return;

            const clean = speakableText(text);
            if (!clean) return;

            const synth = window.speechSynthesis;
            const voice = pickVoice(synth.getVoices ? synth.getVoices() : [], language);

            synth.cancel();

            const utterance = new SpeechSynthesisUtterance(clean);
            if (voice) utterance.voice = voice;
            utterance.rate = 1;
            utterance.pitch = 1;

            synth.speak(utterance);
        },
        [language, speechSupported]
    );

    const stopSpeaking = useCallback(() => {
        if (!speechSupported) return;
        window.speechSynthesis.cancel();
    }, [speechSupported]);

    useEffect(() => {
        let mounted = true;

        getPosts()
            .then((data) => {
                if (mounted) setPosts(Array.isArray(data) ? data.slice(0, MAX_POSTS) : []);
            })
            .catch(() => {
                if (mounted) setPosts([]);
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    useEffect(() => {
        if (voiceReply) return;
        stopSpeaking();
    }, [voiceReply, stopSpeaking]);

    useEffect(() => {
        if (!isOpen) stopSpeaking();
    }, [isOpen, stopSpeaking]);

    useEffect(() => {
        if (!voiceReply) return;

        const last = messages[messages.length - 1];
        if (!last || last.role !== "assistant" || last.id === "welcome") return;
        if (spokenRef.current === last.id) return;

        spokenRef.current = last.id;
        speak(last.text);
    }, [messages, voiceReply, speak]);

    const quickQuestions = useMemo(
        () => [
            "Amakuru mashya ni ayahe?",
            "Ni ibihe byiciro bihari?",
            "Rubavu Today ikora iki?",
            "Shaka inkuru zivuga ku bukungu",
        ],
        []
    );

    const sendQuestion = async (value = question) => {
        const text = cleanText(value);
        if (!text || isLoading) return;

        const previousMessages = messages;
        setQuestion("");
        setIsLoading(true);
        setMessages((current) => [
            ...current,
            { id: `user-${Date.now()}`, role: "user", text },
        ]);

        try {
            const response = await fetch(`${API_BASE_URL}/ai/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: text,
                    history: previousMessages.map((message) => ({
                        role: message.role,
                        content: message.text,
                    })),
                }),
            });
            const data = await response.json();

            if (!response.ok || !data.answer) {
                throw new Error(data.error || "AI request failed");
            }

            const sources = Array.isArray(data.sources) ? data.sources : [];

            setMessages((current) => [
                ...current,
                {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    text: data.answer,
                    sources,
                },
            ]);
        } catch (error) {
            const answer = answerQuestion(text, posts);
            setMessages((current) => [
                ...current,
                {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    ...answer,
                    text: answer.text,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    /* Let the assistant answer out loud: a saved preference toggles
       text-to-speech for every new reply. */
    const toggleVoiceReply = () => {
        const next = !voiceReply;
        setVoiceReply(next);

        try {
            window.localStorage.setItem(VOICE_REPLY_STORAGE_KEY, next ? "1" : "0");
        } catch {
            /* ignore storage failures */
        }

        if (!next) {
            stopSpeaking();
            return;
        }

        const last = messages[messages.length - 1];
        if (last && last.role === "assistant") {
            spokenRef.current = last.id;
            speak(last.text);
        }
    };

    const openPost = (post) => {
        const url =
            typeof post?.url === "string" && post.url
                ? post.url
                : postHref(post);
        window.location.href = url;
        setIsOpen(false);
    };

    return (
        <>
            {isOpen && (
                <section
                    aria-label="Umufasha wa Rubavu Today"
                    className="fixed bottom-20 right-3 z-[60] flex h-[min(560px,calc(100vh-110px))] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-5"
                >
                    <header className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
                        <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
                                <img src={websiteLogo} alt="Rubavu Today" className="h-full w-full object-cover" />
                            </span>
                            <div>
                                <h2 className="font-body text-sm font-bold">Rubavu Today AI</h2>
                                <p className="text-[10px] text-slate-300">Baza amakuru ya Rubavu Today</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {speechSupported && (
                                <button
                                    type="button"
                                    onClick={toggleVoiceReply}
                                    aria-pressed={voiceReply}
                                    aria-label={
                                        voiceReply
                                            ? "Hagarika amajwi y'igisubizo"
                                            : "Umva igisubizo mu ijwi"
                                    }
                                    title={
                                        voiceReply
                                            ? "Hagarika amajwi y'igisubizo"
                                            : "Umva igisubizo mu ijwi"
                                    }
                                    className={`rounded-full p-1.5 transition ${voiceReply
                                        ? "bg-red-600 text-white hover:bg-red-700"
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                        }`}
                                >
                                    {voiceReply ? (
                                        <Volume2 size={18} aria-hidden="true" />
                                    ) : (
                                        <VolumeX size={18} aria-hidden="true" />
                                    )}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                aria-label="Funga umufasha"
                                className="rounded-full p-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            >
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 space-y-3 overflow-y-auto bg-white px-3 py-4">
                        {messages.map((message) => (
                            <MessageBubble key={message.id} message={message} onPostClick={openPost} />
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2">
                                    <div className="flex gap-1">
                                        <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="border-t border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 flex flex-wrap gap-1.5">
                            {quickQuestions.map((quickQuestion) => (
                                <button
                                    key={quickQuestion}
                                    type="button"
                                    onClick={() => sendQuestion(quickQuestion)}
                                    className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600"
                                >
                                    {quickQuestion}
                                </button>
                            ))}
                        </div>
                        <form
                            className="flex items-center gap-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                sendQuestion();
                            }}
                        >
                            <input
                                value={question}
                                onChange={(event) => setQuestion(event.target.value)}
                                placeholder="Andika ikibazo cyawe hano..."
                                aria-label="Andika ikibazo"
                                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                            />
                            <button
                                type="submit"
                                disabled={!question.trim() || isLoading}
                                aria-label="Ohereza ikibazo"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Send size={16} aria-hidden="true" />
                            </button>
                        </form>
                    </div>
                </section>
            )}

            <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                aria-label={isOpen ? "Funga Rubavu Today AI" : "Fungura Rubavu Today AI"}
                title={isOpen ? "Funga umufasha wa Rubavu Today" : "Fungura umufasha wa Rubavu Today"}
                className="group fixed bottom-4 right-3 z-[60] flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-red-600 p-0.5 text-white shadow-lg transition hover:scale-105 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 sm:right-5"
            >
                {isOpen ? (
                    <X size={21} aria-hidden="true" />
                ) : (
                    <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                        <img src={websiteLogo} alt="Umufasha wa Rubavu Today" className="h-full w-full rounded-full object-cover" />
                        <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-950 text-white">
                            <MessageCircle size={10} aria-hidden="true" />
                        </span>
                    </span>
                )}
            </button>
        </>
    );
}
