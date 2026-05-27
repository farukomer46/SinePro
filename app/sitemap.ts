import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  // Şimdilik sitendeki sabit sayfaları buraya ekliyoruz
  return [
    {
      url: 'https://sinepro.com.tr',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://sinepro.com.tr/kesfet', // Eğer /kesfet diye bir sayfan varsa
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // İleride buraya dinamik olarak veri tabanından (API'den) 
    // gelen film sayfalarının linklerini de döngüyle ekleyebileceksin.
  ];
}