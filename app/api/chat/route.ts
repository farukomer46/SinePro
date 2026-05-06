import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ text: "API anahtarı bulunamadı." }, { status: 500 });
    }

    const body = await req.json();
    const prompt = body.prompt;
    const history = body.history || [];

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // EN GÜNCEL VE HIZLI MODEL
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // SİHRİN OLDUĞU YER: Google çökmesin diye karakteri ayarlardan değil, geçmişten veriyoruz.
    const systemPrompt = "Sen SİNEPRO adlı gelişmiş bir film ve dizi platformunun yapay zeka asistanısın. Adın SİNE Aİ. Görevin kullanıcılarla sinema hakkında sohbet etmek, onlara filmler önermek. Kısa, samimi ve bol emojili cevaplar ver.";

    // Gemini'ye gizli bir hafıza aşılıyoruz (Kullanıcı bunu görmez)
    let formattedHistory = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Merhaba! Ben SİNE Aİ, kuralları anladım. Sana nasıl yardımcı olabilirim? 🍿" }] }
    ];

    // Frontend'den gelen kullanıcının asıl geçmişini formata çeviriyoruz
    let userHistory = history
      .filter((msg: any) => msg.role !== 'system')
      .map((msg: any) => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text || "Boş mesaj" }],
      }));

    // İlk mesaj user olmak zorunda kuralı
    while (userHistory.length > 0 && userHistory[0].role === 'model') {
        userHistory.shift();
    }

    // Gizli hafıza ile kullanıcının geçmişini birleştiriyoruz
    formattedHistory = [...formattedHistory, ...userHistory];

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(prompt);
    
    return NextResponse.json({ text: result.response.text() });
    
  } catch (error: any) {
    console.error("Gemini Hatası:", error);
    return NextResponse.json(
      { text: `GERÇEK HATA: ${error.message || error.toString()}` }, 
      { status: 500 }
    );
  }
}