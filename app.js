fetch('models.json')
  .then(response => response.json())
  .then(models => {
    const container = document.getElementById('modelsContainer');
    models.forEach(model => {
      const div = document.createElement('div');
      div.classList.add('model-card');
      div.innerHTML = `
        <h2>${model.name}</h2>
        <p>Рост: ${model.height}</p>
        <div>${model.photos.map(p => `<img src="${p}">`).join('')}</div>
      `;
      container.appendChild(div);
    });
  })
  .catch(err => console.error('Ошибка загрузки моделей:', err));
