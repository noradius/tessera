const keyInput = document.getElementById('api-key');
const sizeSlider = document.getElementById('panel-size');
const sizeLabel = document.getElementById('size-label');
const saveBtn = document.getElementById('save-btn');
const savedMsg = document.getElementById('saved-msg');

// Load saved settings on open
chrome.storage.local.get(['tessera_api_key', 'tessera_panel_size'], (data) => {
  if (data.tessera_api_key) keyInput.value = data.tessera_api_key;
  if (data.tessera_panel_size) {
    sizeSlider.value = data.tessera_panel_size;
    sizeLabel.textContent = data.tessera_panel_size + 'px';
  }
});

// Live preview of size label
sizeSlider.addEventListener('input', () => {
  sizeLabel.textContent = sizeSlider.value + 'px';
});

// Save on button click
saveBtn.addEventListener('click', () => {
  chrome.storage.local.set({
    tessera_api_key: keyInput.value,
    tessera_panel_size: sizeSlider.value
  }, () => {
    savedMsg.classList.add('show');
    setTimeout(() => savedMsg.classList.remove('show'), 2000);
  });
});

// Also save on Enter key in the API key field
keyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
