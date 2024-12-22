document.addEventListener('DOMContentLoaded', () => {
  const apiUrl = 'http://localhost:3000/sheet-data/1hKHREwZq2zaGP-aodDxSXBZtNoAP0BCDMQFt8hfkG8s/Sheet1!A1:Z1000';

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById('mainContainer');
      const searchBar = document.getElementById('searchBar');

      // Function to display cards
      const displayCards = (items) => {
        container.innerHTML = ''; // Clear existing cards
        items.forEach(item => {
          const card = document.createElement('div');
          card.className = 'card';

          // Create card content
          for (const [key, value] of Object.entries(item)) {
            const paragraph = document.createElement('p');
            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = `${key}: `;
            paragraph.appendChild(label);
            paragraph.appendChild(document.createTextNode(value));
            card.appendChild(paragraph);
          }

          container.appendChild(card);
        });
      };

      // Initial display of all cards
      displayCards(data);

      // Search functionality
      searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const searchTerm = searchBar.value.toLowerCase();
          const filteredData = data.filter(item => {
            return Object.values(item).some(value =>
              value && value.toString().toLowerCase().includes(searchTerm)
            );
          });
          displayCards(filteredData);
        }
      });

      const socket = new WebSocket('ws://localhost:8080');

      socket.addEventListener('message', event => {
        console.log('Message from server ', event.data);
        // Fetch the updated data and refresh the display
        fetch(apiUrl)
          .then(response => response.json())
          .then(data => displayCards(data))
          .catch(error => console.error('Error fetching data:', error));
      });
    })
    .catch(error => console.error('Error fetching data:', error));
});
