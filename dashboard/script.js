document.addEventListener('DOMContentLoaded', () => {
    const questionsTable = document.querySelector('.questions-table tbody');
    const editModal = document.getElementById('editQuestionModal');
    const newCategoryModal = document.getElementById('newCategoryModal');
    const dialogOverlay = document.querySelector('.dialog-overlay');
  let currentQuestion = null;
  let categories = new Set();

  // Lade die CSV-Datei beim Start
  loadQuestions();

  // Event-Listener für "Frage hinzufügen"
    document.querySelector('[data-view="add-question"]').addEventListener('click', (e) => {
      e.preventDefault();
      openQuestionModal();
    });

  async function loadQuestions() {
    try {
            const response = await fetch('../questions.csv');
      const csvText = await response.text();
            const lines = csvText.split('\n');
            const questions = lines.slice(1).map(line => {
                const [id, question, category, ...answers] = line.split(',');
        categories.add(category); // Sammle alle Kategorien
        return {
          id,
          question,
          category,
          answers: answers.slice(0, 4),
                    correctAnswer: parseInt(answers[4])
        };
      });
      renderTable(questions);
      updateCategorySelect();
    } catch (error) {
            console.error('Error loading questions:', error);
    }
  }

  function renderTable(questions) {
        questionsTable.innerHTML = questions.map(q => `
            <tr>
            <td>${q.id}</td>
            <td>${q.question}</td>
                <td class="action-buttons">
    <button class="btn-action btn-edit" data-id="${q.id}">
        <img src="../assets/edit-icon.svg" alt="Edit" class="action-icon">
    </button>
    <button class="btn-action btn-delete" data-id="${q.id}">
                        <img src="../assets/cancel-icon.svg" alt="Delete" class="action-icon">
    </button>
</td>
        </tr>
        `).join('');

    // Event-Listener für Action-Buttons
        questionsTable.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', () => {
            const questionId = button.getAttribute('data-id');
            handleEdit(questionId);
        });
    });

    questionsTable.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', () => {
            const questionId = button.getAttribute('data-id');
            handleDelete(questionId);
        });
    });
}

    function updateCategorySelect() {
        const categorySelect = document.getElementById('categorySelect');
        categorySelect.innerHTML = `
            <option value="">Kategorie wählen</option>
            ${Array.from(categories)
                .map(cat => `<option value="${cat}">${cat}</option>`)
                .join('')}
            <option value="new">Neue Kategorie erstellen</option>
        `;
    }

    function openQuestionModal(questionData = null) {
        const form = document.getElementById('questionForm');
        const modalTitle = document.getElementById('modalTitle');
        const saveButton = document.querySelector('.save-question');
        const closeButton = document.querySelector('.close-modal');
        
        // Update close button
        closeButton.innerHTML = `<img src="../assets/close-icon.svg" alt="Close" class="modal-icon">`;
        
        // Reset form
        form.reset();
        clearErrors();
        
        if (questionData) {
            // Edit mode
            modalTitle.textContent = 'Frage bearbeiten';
            document.getElementById('questionText').value = questionData.question;
            document.getElementById('correctAnswer').value = questionData.answers[questionData.correctAnswer];
            document.getElementById('wrongAnswer1').value = questionData.answers[(questionData.correctAnswer + 1) % 4];
            document.getElementById('wrongAnswer2').value = questionData.answers[(questionData.correctAnswer + 2) % 4];
            document.getElementById('wrongAnswer3').value = questionData.answers[(questionData.correctAnswer + 3) % 4];
            document.getElementById('categorySelect').value = questionData.category;
            
            saveButton.innerHTML = `
                <span class="icon">
                    <img src="../assets/save-icon.svg" alt="Save" class="button-icon">
                </span>
                <span class="button-text">Speichern</span>
            `;
        } else {
            // Add mode
            modalTitle.textContent = 'Neue Frage hinzufügen';
            saveButton.innerHTML = `
                <span class="icon">
                    <img src="../assets/plus-icon.svg" alt="Add" class="button-icon">
                </span>
                <span class="button-text">Hinzufügen</span>
            `;
        }

        currentQuestion = questionData;
        editModal.style.display = 'flex';
      }

    async function handleEdit(questionId) {
    try {
            const response = await fetch('../questions.csv');
            const csvText = await response.text();
            const lines = csvText.split('\n');
            const question = lines.slice(1).find(line => {
                const [id] = line.split(',');
                return id === questionId;
            });

            if (question) {
                const [id, questionText, category, ...answers] = question.split(',');
                const questionData = {
                    id,
                    question: questionText,
                    category,
                    answers: answers.slice(0, 4),
                    correctAnswer: parseInt(answers[4])
                };
                openQuestionModal(questionData);
      }
    } catch (error) {
            console.error('Error loading question:', error);
    }
  }

    function handleDelete(questionId) {
        const dialog = dialogOverlay.querySelector('.dialog');
        dialog.innerHTML = `
            <h2>
                <img src="../assets/warning-icon.svg" alt="Warning" class="dialog-icon">
                Frage löschen?
            </h2>
            <div class="dialog-buttons">
                <button class="dialog-button delete">
                    <img src="../assets/cancel-icon.svg" alt="Delete" class="button-icon">
                    <span>Ja, löschen</span>
                </button>
                <button class="dialog-button cancel">
                    <img src="../assets/close-icon.svg" alt="Cancel" class="button-icon">
                    <span>Abbrechen</span>
                </button>
            </div>
        `;

        dialogOverlay.style.display = 'flex';
        
        const deleteButton = dialog.querySelector('.dialog-button.delete');
        const cancelButton = dialog.querySelector('.dialog-button.cancel');
        
        deleteButton.onclick = async () => {
            try {
                const response = await fetch('../questions.csv');
                const csvText = await response.text();
                const lines = csvText.split('\n');
                const updatedLines = lines.filter(line => {
                    const [id] = line.split(',');
                    return id !== questionId;
});
                
                await saveToCSV(updatedLines.join('\n'));
                loadQuestions();
                dialogOverlay.style.display = 'none';
            } catch (error) {
                console.error('Error deleting question:', error);
            }
        };
        
        cancelButton.onclick = () => {
            dialogOverlay.style.display = 'none';
        };
    }

    // Event-Listener für Category Select
    document.getElementById('categorySelect').addEventListener('change', (e) => {
        if (e.target.value === 'new') {
            newCategoryModal.style.display = 'flex';
        }
});

    // Event-Listener für Modal-Schließen-Buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            editModal.style.display = 'none';
            newCategoryModal.style.display = 'none';
        });
    });

    // Event-Listener für neue Kategorie
    document.querySelector('.save-category').addEventListener('click', () => {
        const newCategory = document.getElementById('newCategoryName').value.trim();
        if (newCategory) {
            categories.add(newCategory);
            updateCategorySelect();
            document.getElementById('categorySelect').value = newCategory;
            newCategoryModal.style.display = 'none';
        }
    });

    document.querySelector('.cancel-category').addEventListener('click', () => {
        newCategoryModal.style.display = 'none';
        document.getElementById('categorySelect').value = currentQuestion?.category || '';
    });

    // Event-Listener für Frage speichern/hinzufügen
    document.querySelector('.save-question').addEventListener('click', async () => {
        if (!validateForm()) return;

        const questionData = {
            id: currentQuestion?.id || Date.now().toString(),
            question: document.getElementById('questionText').value.trim(),
            category: document.getElementById('categorySelect').value,
            answers: [
                document.getElementById('correctAnswer').value.trim(),
                document.getElementById('wrongAnswer1').value.trim(),
                document.getElementById('wrongAnswer2').value.trim(),
                document.getElementById('wrongAnswer3').value.trim()
            ],
            correctAnswer: 0
        };

        try {
            const response = await fetch('../questions.csv');
            const csvText = await response.text();
            const lines = csvText.split('\n');
            let updatedLines;

            if (currentQuestion) {
                // Update existing question
                updatedLines = lines.map(line => {
                    const [id] = line.split(',');
                    if (id === questionData.id) {
                        return `${questionData.id},${questionData.question},${questionData.category},${questionData.answers.join(',')},${questionData.correctAnswer}`;
                    }
                    return line;
                });
            } else {
                // Add new question
                updatedLines = [...lines, `${questionData.id},${questionData.question},${questionData.category},${questionData.answers.join(',')},${questionData.correctAnswer}`];
            }

            await saveToCSV(updatedLines.join('\n'));
            loadQuestions();
            editModal.style.display = 'none';
        } catch (error) {
            console.error('Error saving question:', error);
        }
    });

    // Event-Listener für Abbrechen-Button
    document.querySelector('.cancel-edit').addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    function validateForm() {
        const form = document.getElementById('questionForm');
        const inputs = form.querySelectorAll('input[required], select[required]');
        let isValid = true;
        
        clearErrors();
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                showError(input, 'Dieses Feld ist erforderlich');
                isValid = false;
            }
        });
        
        const answers = [
            document.getElementById('correctAnswer').value,
            document.getElementById('wrongAnswer1').value,
            document.getElementById('wrongAnswer2').value,
            document.getElementById('wrongAnswer3').value
        ].map(a => a.trim().toLowerCase());
        
        const uniqueAnswers = new Set(answers);
        if (uniqueAnswers.size !== answers.length) {
            showError(document.getElementById('correctAnswer'), 'Alle Antworten müssen unterschiedlich sein');
            isValid = false;
        }
        
        return isValid;
    }

    function showError(input, message) {
        input.classList.add('error');
        const errorDiv = input.parentElement.querySelector('.error-message');
        errorDiv.innerHTML = `
            <img src="../assets/error-icon.svg" alt="Error" class="error-icon">
            ${message}
        `;
    }

    function clearErrors() {
        const form = document.getElementById('questionForm');
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        form.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    }

    async function saveToCSV(content) {
        try {
            const response = await fetch('../questions.csv', {
                method: 'PUT',
                body: content,
                headers: {
                    'Content-Type': 'text/csv'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to save CSV');
            }
        } catch (error) {
            console.error('Error saving questions:', error);
            alert('Fehler beim Speichern der Änderungen');
        }
    }
});