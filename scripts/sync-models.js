const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Конфигурация
const CONFIG = {
  // Пути к файлам
  JSON_OUTPUT_PATH: path.join(__dirname, '..', 'data', 'models.json'),
  PHOTOS_DIR: path.join(__dirname, '..', 'photos'),
  
  // ID таблицы Google Sheets (из переменных окружения)
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || '',
  
  // Настройки Яндекс.Диска (опционально)
  YANDEX_DISK_FOLDER: process.env.YANDEX_DISK_FOLDER || ''
};

// Основная функция
async function syncModels() {
  console.log('🔄 Starting models synchronization...');
  
  try {
    // 1. Получаем данные из Google Sheets
    console.log('📊 Fetching data from Google Sheets...');
    const models = await getModelsFromGoogleSheets();
    
    console.log(`✅ Found ${models.length} models`);
    
    // 2. Получаем фото для каждой модели (опционально)
    console.log('🖼️ Processing photos...');
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      console.log(`   ${i + 1}/${models.length}: ${model.name} (${model.id})`);
      
      // Если у модели нет фото, пытаемся получить
      if (!model.photos || model.photos.length === 0) {
        const photos = await getPhotosForModel(model.id);
        if (photos.length > 0) {
          model.photos = photos;
          console.log(`     Added ${photos.length} photos`);
        }
      }
    }
    
    // 3. Сохраняем в JSON
    console.log('💾 Saving to JSON file...');
    await saveModelsToJSON(models);
    
    // 4. Генерируем отчет
    const stats = {
      totalModels: models.length,
      modelsWithPhotos: models.filter(m => m.photos && m.photos.length > 0).length,
      totalPhotos: models.reduce((sum, m) => sum + (m.photos ? m.photos.length : 0), 0),
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Statistics:', stats);
    console.log('🎉 Synchronization completed successfully!');
    
    return { success: true, stats };
    
  } catch (error) {
    console.error('❌ Synchronization failed:', error.message);
    throw error;
  }
}

// Функция чтения из Google Sheets
async function getModelsFromGoogleSheets() {
  const { GOOGLE_SHEET_ID } = CONFIG;
  
  if (!GOOGLE_SHEET_ID) {
    console.log('⚠️ No Google Sheet ID provided, using sample data');
    return getSampleData();
  }
  
  try {
    // Инициализация Google Sheets
    const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID);
    
    // Авторизация через сервисный аккаунт
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, 'base64').toString()
    );
    
    await doc.useServiceAccountAuth(serviceAccount);
    await doc.loadInfo();
    
    // Читаем данные с первого листа
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    // Преобразуем в нужный формат
    return rows.map(row => {
      const model = {
        id: String(row.id || row.ID || '').trim(),
        name: String(row.name || row.Name || '').trim(),
        height: row.height || row.Height || '',
        measurements: row.measurements || row.Measurements || '',
        city: row.city || row.City || '',
        category: row.category || row.Category || '',
        bio: row.bio || row.Bio || '',
        is_available: !(row.is_available === 'false' || row.available === 'false'),
        photos: []
      };
      
      // Если в таблице есть колонка с фото, используем ее
      if (row.photos || row.Photos) {
        const photos = String(row.photos || row.Photos || '').split(',').map(p => p.trim()).filter(p => p);
        if (photos.length > 0) {
          model.photos = photos;
        }
      }
      
      return model;
    }).filter(model => model.id && model.name); // Фильтруем пустые
    
  } catch (error) {
    console.error('Error reading Google Sheets:', error.message);
    return getSampleData(); // Возвращаем тестовые данные при ошибке
  }
}

// Функция для получения фото (опционально)
async function getPhotosForModel(modelId) {
  const { YANDEX_DISK_FOLDER } = CONFIG;
  
  if (!YANDEX_DISK_FOLDER) {
    // Если Яндекс.Диск не настроен, возвращаем тестовые фото
    return [
      `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/800/1000`,
      `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/800/1000`
    ];
  }
  
  // Здесь можно добавить логику для Яндекс.Диска
  // Это сложнее и требует API ключа
  
  return [];
}

// Сохранение в JSON файл
async function saveModelsToJSON(models) {
  const { JSON_OUTPUT_PATH } = CONFIG;
  
  // Создаем директорию если нет
  const dir = path.dirname(JSON_OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Форматируем JSON
  const jsonData = JSON.stringify(models, null, 2);
  
  // Сохраняем файл
  fs.writeFileSync(JSON_OUTPUT_PATH, jsonData, 'utf8');
  
  console.log(`✅ JSON saved to: ${JSON_OUTPUT_PATH}`);
  console.log(`📁 File size: ${jsonData.length} bytes`);
}

// Тестовые данные (если нет доступа к Google Sheets)
function getSampleData() {
  return [
    {
      id: "anna_ivanova",
      name: "Анна Иванова",
      height: "175",
      measurements: "88-60-90",
      city: "Москва",
      category: "fashion",
      is_available: true,
      bio: "Опыт работы 3 года. Участвовала в показах Mercedes-Benz Fashion Week.",
      photos: [
        "https://picsum.photos/id/1005/800/1000",
        "https://picsum.photos/id/1011/800/1000"
      ]
    },
    {
      id: "maria_petrova",
      name: "Мария Петрова",
      height: "168",
      city: "Санкт-Петербург",
      category: "commercial",
      is_available: true,
      bio: "Специализация: рекламные съемки, каталоги.",
      photos: [
        "https://picsum.photos/id/1025/800/1000",
        "https://picsum.photos/id/1027/800/1000"
      ]
    }
  ];
}

// Запуск скрипта
if (require.main === module) {
  syncModels()
    .then(result => {
      console.log('✅ Script completed:', result.stats);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { syncModels };
