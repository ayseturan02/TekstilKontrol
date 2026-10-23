# İnternet Tekstil Kontrol — React Native CLI

Android telefon ve tablet için tamamen bağımsız (sunucusuz / offline çalışabilen) React Native CLI kontrol formu uygulamasıdır.

## Özellikler
- **Sunucusuz ve Çevrimdışı Çalışma:** Harici bir backend sunucusuna ihtiyaç duymaz. Tüm işlemler doğrudan cihaz üzerinde gerçekleşir.
- **Dikey Dijital Kontrol Formu:** `shared/paperLayout.js` içinde vektör tabanlı, A4 dikey kontrol formu. Alanlara dokunulduğunda otomatik yakınlaşma, imza alanı ve 40 adede kadar medya (fotoğraf/video) ekleme.
- **Cihazda Yerel Taslak:** Form ve ekler cihazın `AsyncStorage` hafızasında otomatik saklanır (`paper-form-v4:device`).
- **Cihazda Yerel PDF Üretimi:** `react-native-html-to-pdf` ile A4 kontrol raporu doğrudan telefonda PDF formatına dönüştürülür.
- **Kayıtlı E-Posta Alıcıları:** Girilen e-posta adresleri telefon hafızasında saklanır. Gönderim ekranında kayıtlı adresler listelenir, yenileri eklenebilir veya silinebilir.
- **Doğrudan Mail Taslağı:** Seçilen alıcılar, konu, özet metin ve oluşturulan A4 PDF raporu (ile fotoğraf/videolar) telefonun kurulu mail uygulamasına (ör. Gmail) taslak olarak aktarılır. Kullanıcının sadece Gönder butonuna basması yeterlidir.

## Kurulum ve Çalıştırma
1. Node.js 20+, JDK 17, Android Studio ve Android SDK gereklidir.
2. Bağımlılıkları yükleyin: `npm install --legacy-peer-deps`
3. Metro başlatın: `npx react-native start`
4. Android uygulamasını derleyip kurun: `npx react-native run-android`

## Testler
- `npm run build:paper`: Webview rapor scriptini derler.
- `npm run typecheck`: TypeScript tip kontrollerini yapar.
- `npm test`: Birim ve entegrasyon testlerini çalıştırır.
