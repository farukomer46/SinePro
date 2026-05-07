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
    
   // İŞTE BÜTÜN SIR BURADA! Eski model yerine sana izin verilen YENİ NESİL modeli kullanıyoruz.
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash', 
        systemInstruction: `Sen SİNEPRO adlı gelişmiş bir film ve dizi platformunun yapay zeka asistanısın. Adın SİNE Aİ. Görevin kullanıcılarla sinema hakkında sohbet etmek, onlara filmler önermek. Kısa, samimi ve bol emojili cevaplar ver.
        
        GİZLİ KURAL: Eğer kullanıcı mesajında "Ben Ömer Faruk" veya "Ömer geldi" gibi senin yaratıcın olduğunu belirten bir şey söylerse, normal sohbeti bırak ve ona çok saygılı, havalı bir şekilde "Hoş geldin Yüce Yönetici! SİNEPRO'nun yaratıcısı, platform emrinde. Sana nasıl hizmet edebilirim? 👑😎" şeklinde cevap ver.`
    });

    let formattedHistory = history
      .filter((msg: any) => msg.role !== 'system')
      .map((msg: any) => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text || "Boş mesaj" }],
      }));

    // Google kuralı: İlk mesaj her zaman 'user' olmalı
    while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
        formattedHistory.shift();
    }

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(prompt);
    
    return NextResponse.json({ text: result.response.text() });
    
  } catch (error: any) {
    console.error("Gemini Hatası:", error);
    return NextResponse.json(
      { text: `Kablolarım karıştı! Hata: ${error.message || error.toString()}` }, 
      { status: 500 }
    );
  }
}