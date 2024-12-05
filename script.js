document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.querySelector(".welcome-screen .start-button");
  const welcomeScreen = document.querySelector(".welcome-screen");
  const quizScreen = document.querySelector(".quiz-screen");
  const quizManager = new QuizManager();
  const homeLogo = document.querySelector(".home-link");
  const categoriesContainer = document.getElementById("categories");
  const questionCountSelect = document.getElementById("questionCount");

  // Initialisiere die Kategorien-Checkboxen
  quizManager.loadQuestionsFromCSV().then(() => {
    const categories = quizManager.getCategories();
    categoriesContainer.innerHTML = categories
      .map(
        (cat) => `
            <div class="category-checkbox-wrapper">
                <input type="checkbox" 
                       id="cat-${cat.name}" 
                       value="${cat.name}" 
                       checked>
                <label for="cat-${cat.name}">
                    ${cat.name} 
                    <span class="category-count">(${cat.count})</span>
                </label>
            </div>
        `
      )
      .join("");

    // Event-Listener für die Checkbox-Wrapper
    document
      .querySelectorAll(".category-checkbox-wrapper")
      .forEach((wrapper) => {
        wrapper.addEventListener("click", (e) => {
          const checkbox = wrapper.querySelector('input[type="checkbox"]');
          if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
            e.preventDefault(); // Verhindert ungewolltes Verhalten
          }
        });
      });
  });

  startButton.addEventListener("click", async () => {
    const selectedCategories = Array.from(
      document.querySelectorAll('#categories input[type="checkbox"]:checked')
    ).map((checkbox) => checkbox.value);

    const requestedQuestionCount = parseInt(questionCountSelect.value);

    if (selectedCategories.length === 0) {
      alert("Bitte wähle mindestens eine Kategorie aus!");
      return;
    }

    welcomeScreen.classList.add("fade-out");
    await quizManager.prepareQuiz(selectedCategories, requestedQuestionCount);

    setTimeout(() => {
      welcomeScreen.classList.remove("active");
      quizScreen.classList.add("active");
      quizScreen.classList.add("fade-in");
      quizManager.displayQuestion();

      document.querySelectorAll(".answer-button").forEach((button) => {
        button.addEventListener("click", (e) => {
          const selectedIndex = parseInt(e.target.dataset.index);
          quizManager.handleAnswerSelection(selectedIndex);
        });
      });
    }, 500);
  });

  // Logo-Klick Handler für Rückkehr zum Startbildschirm
  homeLogo.addEventListener("click", () => {
    returnToHome();
  });

  function returnToHome() {
    quizScreen.classList.add("fade-out");
    setTimeout(() => {
      quizScreen.classList.remove("active", "fade-out");
      welcomeScreen.classList.remove("fade-out");
      welcomeScreen.classList.add("active", "fade-in");
      quizManager.resetQuiz();

      // Quiz-Card und Summary zurücksetzen
      document.querySelector(".quiz-card").style.display = "block";
      document.querySelector(".quiz-summary").style.display = "none";
    }, 500);
  }
});

class QuizManager {
  constructor() {
    this.allQuestions = [];
    this.activeQuestions = [];
    this.currentQuestionIndex = 0;
    this.totalQuestions = 0;
    this.quizAnswers = [];
    this.selectedCategories = [];
    this.requestedQuestionCount = 10;
  }

  async loadQuestionsFromCSV() {
    try {
      const response = await fetch("questions.csv");
      const csvText = await response.text();
      const lines = csvText.split("\n").slice(1); // Skip header

      this.allQuestions = lines.map((line) => {
        const [id, question, categories, ...answers] = line.split(",");
        return {
          id: parseInt(id),
          question: question,
          category: categories,
          answers: answers.slice(0, 4),
          correctAnswer: parseInt(answers[4]),
        };
      });
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  }

  getCategories() {
    const categoryCount = {};
    this.allQuestions.forEach((q) => {
      categoryCount[q.category] = (categoryCount[q.category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async prepareQuiz(selectedCategories, requestedCount) {
    this.selectedCategories = selectedCategories;
    this.requestedQuestionCount = requestedCount;

    const filteredQuestions = this.allQuestions.filter((q) =>
      selectedCategories.includes(q.category)
    );

    this.totalQuestions = Math.min(requestedCount, filteredQuestions.length);
    this.activeQuestions = this.shuffleArray([...filteredQuestions]).slice(
      0,
      this.totalQuestions
    );
    this.currentQuestionIndex = 0;
    this.quizAnswers = [];
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  shuffleAnswers(answers) {
    return this.shuffleArray([...answers]);
  }

  updateQuestionCounter() {
    const counterElement = document.querySelector(".question-counter");
    counterElement.textContent = `Frage ${this.currentQuestionIndex + 1} von ${
      this.totalQuestions
    }`;
  }

  displayQuestion() {
    const question = this.activeQuestions[this.currentQuestionIndex];
    const questionText = document.getElementById("question-text");
    const categoryLabel = document.querySelector(".category-label");
    const answerButtons = document.querySelectorAll(".answer-button");

    this.updateQuestionCounter();

    questionText.textContent = question.question;
    categoryLabel.textContent = question.category;

    const shuffledAnswers = this.shuffleAnswers(
      question.answers.map((text, index) => ({
        text,
        isCorrect: index === question.correctAnswer,
      }))
    );

    answerButtons.forEach((button, index) => {
      button.textContent = shuffledAnswers[index].text;
      button.dataset.correct = shuffledAnswers[index].isCorrect;
      button.className = "answer-button";
      button.disabled = false;
    });
  }

  handleAnswerSelection(selectedIndex) {
    const answerButtons = document.querySelectorAll(".answer-button");
    answerButtons.forEach((button) => (button.disabled = true));

    const selectedButton = answerButtons[selectedIndex];
    const isCorrect = selectedButton.dataset.correct === "true";

    this.quizAnswers.push({
      question: this.activeQuestions[this.currentQuestionIndex].question,
      selectedAnswer: selectedButton.textContent,
      correctAnswer: Array.from(answerButtons).find(
        (b) => b.dataset.correct === "true"
      ).textContent,
      isCorrect: isCorrect,
    });

    if (isCorrect) {
      selectedButton.classList.add("correct");
      setTimeout(() => this.nextQuestion(), 1500);
    } else {
      selectedButton.classList.add("wrong");
      answerButtons.forEach((button) => {
        if (button.dataset.correct === "true") {
          button.classList.add("correct");
        }
      });
      setTimeout(() => this.nextQuestion(), 2000);
    }
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex < this.activeQuestions.length) {
      this.displayQuestion();
    } else {
      this.showQuizSummary();
    }
  }

  showQuizSummary() {
    const quizCard = document.querySelector(".quiz-card");
    const quizSummary = document.querySelector(".quiz-summary");
    const summaryContent = quizSummary.querySelector(".summary-content");
    const quizContainer = document.querySelector(".quiz-container");

    quizCard.style.display = "none";
    // Erlaube Scrollen für die Zusammenfassung
    quizContainer.style.height = "auto";
    quizContainer.style.overflow = "visible";

    const correctAnswers = this.quizAnswers.filter((a) => a.isCorrect).length;
    summaryContent.innerHTML = `
            <p>Du hast ${correctAnswers} von ${
      this.totalQuestions
    } Fragen richtig beantwortet!</p>
            <div class="summary-questions">
                ${this.quizAnswers
                  .map(
                    (answer, index) => `
                    <div class="summary-question">
                        <h4>Frage ${index + 1}: ${answer.question}</h4>
                        <div class="summary-answer ${
                          answer.isCorrect ? "correct" : "wrong"
                        }">
                            <span>Deine Antwort: ${answer.selectedAnswer}</span>
                            ${
                              !answer.isCorrect
                                ? `<span>(Richtige Antwort: ${answer.correctAnswer})</span>`
                                : ""
                            }
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;

    quizSummary.style.display = "block";

    const retryButton = quizSummary.querySelector(".retry");
    const homeButton = quizSummary.querySelector(".home");

    retryButton.replaceWith(retryButton.cloneNode(true));
    homeButton.replaceWith(homeButton.cloneNode(true));

    quizSummary
      .querySelector(".retry")
      .addEventListener("click", () => this.restartQuiz());
    quizSummary.querySelector(".home").addEventListener("click", () => {
      document.querySelector(".home-link").click();
    });
  }

  async restartQuiz() {
    const quizCard = document.querySelector(".quiz-card");
    const quizSummary = document.querySelector(".quiz-summary");
    const quizContainer = document.querySelector(".quiz-container");

    quizSummary.style.display = "none";
    quizCard.style.display = "block";

    // Setze Scroll-Verhalten zurück
    quizContainer.style.height = "calc(100dvh - 80px)";
    quizContainer.style.overflow = "hidden";

    this.quizAnswers = [];
    this.currentQuestionIndex = 0;

    await this.prepareQuiz(
      this.selectedCategories,
      this.requestedQuestionCount
    );
    this.displayQuestion();
  }

  resetQuiz() {
    this.currentQuestionIndex = 0;
    this.activeQuestions = [];
    this.totalQuestions = 0;
    this.quizAnswers = [];

    // Setze Scroll-Verhalten zurück
    const quizContainer = document.querySelector(".quiz-container");
    quizContainer.style.height = "calc(100dvh - 80px)";
    quizContainer.style.overflow = "hidden";
  }
}
