document.getElementById('btnLoadAll').addEventListener('click', async () => {
  try {
    const all = await chrome.storage.local.get(null);
    document.getElementById('output').textContent = JSON.stringify(all, null, 2);
  } catch (error) {
    document.getElementById('output').innerHTML = `<span class="error">Error: ${error.message}</span>`;
  }
});

document.getElementById('btnLoadGenerated').addEventListener('click', async () => {
  try {
    const all = await chrome.storage.local.get(null);
    const generated = {};
    
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith('generated_adapter_')) {
        generated[key] = value;
      }
    }
    
    if (Object.keys(generated).length === 0) {
      document.getElementById('output').textContent = 'No generated adapters found.';
    } else {
      document.getElementById('output').textContent = JSON.stringify(generated, null, 2);
    }
  } catch (error) {
    document.getElementById('output').innerHTML = `<span class="error">Error: ${error.message}</span>`;
  }
});

document.getElementById('btnClear').addEventListener('click', async () => {
  try {
    const all = await chrome.storage.local.get(null);
    const keysToRemove = [];
    
    for (const key of Object.keys(all)) {
      if (key.startsWith('generated_adapter_')) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      document.getElementById('output').textContent = `Cleared ${keysToRemove.length} generated adapters:\n${keysToRemove.join('\n')}`;
    } else {
      document.getElementById('output').textContent = 'No generated adapters to clear.';
    }
  } catch (error) {
    document.getElementById('output').innerHTML = `<span class="error">Error: ${error.message}</span>`;
  }
});
