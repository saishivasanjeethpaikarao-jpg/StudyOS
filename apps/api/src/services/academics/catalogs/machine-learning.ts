import type { SubjectCurriculumPackage } from '../types.js';

export const machineLearningPackage: SubjectCurriculumPackage = {
  "id": "machine-learning",
  "aliases": [
    "machine learning",
    "ml",
    "ai",
    "deep learning",
    "neural networks",
    "data science ml"
  ],
  "subject": {
    "name": "Machine Learning & Deep Learning",
    "description": "Statistical learning, gradient descent, loss functions, Scikit-Learn, PyTorch neural networks, and model deployment.",
    "color": "#8B5CF6",
    "icon": "brain"
  },
  "assignments": [
    {
      "title": "Week 1 Project: Housing Price Regression & Gradient Descent from Scratch",
      "description": "Implement simple and multivariate linear regression from scratch using NumPy vectorization, gradient descent, and MSE cost functions.",
      "daysDue": 7
    },
    {
      "title": "Week 2 Project: Multi-Class Disease Diagnostics with Logistic Regression & SVM",
      "description": "Train and evaluate diagnostic classifiers; compute precision, recall, ROC-AUC, and F1 scores using Scikit-Learn pipelines.",
      "daysDue": 14
    },
    {
      "title": "Week 3 Project: Deep Neural Network from Scratch with Backpropagation",
      "description": "Build a multi-layer perceptron (MLP) from scratch: forward pass, ReLU activations, cross-entropy loss, and backpropagation gradients.",
      "daysDue": 21
    },
    {
      "title": "Week 4 Capstone: PyTorch Image Classifier & REST Inference Microservice",
      "description": "Train a Convolutional Neural Network (CNN) on CIFAR-10 in PyTorch; export model weights and wrap in a high-speed FastAPI inference service.",
      "daysDue": 28
    }
  ],
  "resources": [
    {
      "type": "youtube",
      "title": "Machine Learning for Everybody - Full Course (freeCodeCamp)",
      "url": "https://www.youtube.com/watch?v=i_LwzRVP7bg",
      "providerItemId": "i_LwzRVP7bg"
    },
    {
      "type": "youtube",
      "title": "But what is a neural network? | Deep Learning Chapter 1 (3Blue1Brown)",
      "url": "https://www.youtube.com/watch?v=aircAruvnKk",
      "providerItemId": "aircAruvnKk"
    },
    {
      "type": "web",
      "title": "Scikit-Learn Official User Guide & Tutorials",
      "url": "https://scikit-learn.org/stable/user_guide.html",
      "providerItemId": null
    },
    {
      "type": "web",
      "title": "PyTorch Official Deep Learning Tutorials",
      "url": "https://pytorch.org/tutorials/",
      "providerItemId": null
    }
  ],
  "lectureDecks": [
    {
      "title": "Lecture 1: The Machine Learning Taxonomy, Loss Functions & Gradient Descent",
      "body": "## [SLIDE 1] 🎯 Course Objectives & The Machine Learning Paradigm\nWelcome to Machine Learning & Deep Learning! Unlike classical programming where engineers write explicit rules, ML algorithms discover patterns and decision boundaries directly from data.\n\n### 🎯 Key Learning Objectives\n* Understand Supervised, Unsupervised, and Reinforcement Learning.\n* Formulate Cost Functions: Mean Squared Error (MSE) and Cross-Entropy.\n* Master Gradient Descent optimization: Learning Rates and Local Minima.\n\n💡 **Professor's Tip:** Machine learning is applied multivariable calculus and linear algebra. Every model optimizes a loss function by following the negative gradient!\n\n---\n\n## [SLIDE 2] 🧠 Classical Programming vs Machine Learning\n```text\nClassical Programming:\nData + Rules ────────────────────────► Answers\n\nMachine Learning:\nData + Answers (Labels) ─────────────► Rules / Model Weights\n```\n\n---\n\n## [SLIDE 3] 🏗️ The Gradient Descent Optimization Loop\nCost Function $J(\\theta)$ represents model error.\nUpdate rule:\n$$\\theta := \\theta - \\alpha \\nabla J(\\theta)$$\nWhere:\n* $\\theta$: Model parameters (weights & bias)\n* $\\alpha$: Learning Rate (step size)\n* $\\nabla J(\\theta)$: Gradient vector of partial derivatives\n\n```text\nLoss J(w)\n   ▲         * Start\n   │          \\\n   │           \\ Step 1\n   │            \\\n   │             * Step 2\n   │               \\\n   │                * Minimum J(w*)\n   └────────────────────────────────► Weight (w)\n```\n\n---\n\n## [SLIDE 4] 💻 Production Code: Vectorized Linear Regression\n```python\nimport numpy as np\n\nclass LinearRegressionScratch:\n    def __init__(self, lr: float = 0.01, iterations: int = 1000):\n        self.lr = lr\n        self.iterations = iterations\n        self.weights = None\n        self.bias = 0.0\n\n    def fit(self, X: np.ndarray, y: np.ndarray):\n        n_samples, n_features = X.shape\n        self.weights = np.zeros(n_features)\n        \n        for _ in range(self.iterations):\n            # 1. Forward prediction: y_pred = X . w + b\n            y_pred = np.dot(X, self.weights) + self.bias\n            \n            # 2. Compute gradients\n            dw = (1 / n_samples) * np.dot(X.T, (y_pred - y))\n            db = (1 / n_samples) * np.sum(y_pred - y)\n            \n            # 3. Update weights\n            self.weights -= self.lr * dw\n            self.bias -= self.lr * db\n\n    def predict(self, X: np.ndarray) -> np.ndarray:\n        return np.dot(X, self.weights) + self.bias\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Learning Rate Too High:** If $\\alpha$ is too large, gradient descent will overshoot the minimum and diverge to infinity! Always check for exploding loss values.\n2. **Data Leakage in Normalization:** Fitting scalers (`StandardScaler`) on the ENTIRE dataset before train/test splitting leaks test distribution information into the training phase. ALWAYS fit on train data only!\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What does the gradient $\\nabla J(\\theta)$ represent mathematically?\n  * *Answer:* The vector of partial derivatives pointing in the direction of steepest ascent of the cost function.\n* **Q2:** Why do we subtract the gradient in the weight update equation?\n  * *Answer:* To move in the direction of steepest descent, thereby minimizing the error."
    },
    {
      "title": "Lecture 2: Classification, Logistic Regression & Evaluation Metrics",
      "body": "## [SLIDE 1] 🎯 Binary Classification & The Sigmoid Activation\nClassification predicts discrete category labels rather than continuous numbers.\n\n### 🎯 Key Learning Objectives\n* Understand Logistic Regression and the Sigmoid function $\\sigma(z)$.\n* Formulate Binary Cross-Entropy (Log Loss).\n* Evaluate models: Precision, Recall, F1-Score, and ROC-AUC.\n\n---\n\n## [SLIDE 2] 🧠 The Sigmoid Function\n$$\\sigma(z) = \\frac{1}{1 + e^{-z}}$$\nMaps any real-valued number into a calibrated probability range $[0, 1]$.\n\n```text\nP(y=1)\n  1.0 ┼                       ╭───────────\n      │                     ╭╯\n  0.5 ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─*─ ─ ─ ─ ─ ─ ─  Decision Threshold (0.5)\n      │                  ╭╯\n  0.0 ┼ ───────────────╯\n      └───────────────────────────────────► z = w^T x + b\n```\n\n---\n\n## [SLIDE 3] 🏗️ Confusion Matrix Breakdown\n| Actual \\ Predicted | Predicted Negative (0) | Predicted Positive (1) |\n| :--- | :--- | :--- |\n| **Actual Negative (0)** | **True Negative (TN)** | **False Positive (FP)** (Type I Error) |\n| **Actual Positive (1)** | **False Negative (FN)** (Type II Error) | **True Positive (TP)** |\n\n* **Precision:** $\\frac{\\text{TP}}{\\text{TP} + \\text{FP}}$ (When model flags positive, how often is it right?)\n* **Recall (Sensitivity):** $\\frac{\\text{TP}}{\\text{TP} + \\text{FN}}$ (How many actual positive cases did model catch?)\n* **F1-Score:** Harmonic mean $2 \\cdot \\frac{P \\cdot R}{P + R}$\n\n---\n\n## [SLIDE 4] 💻 Production Code: Diagnostic Pipeline\n```python\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.metrics import classification_report, roc_auc_score\n\ndef build_diagnostic_model(X_train, y_train, X_test, y_test):\n    # Chain scaler and model into leak-free pipeline\n    pipeline = Pipeline([\n        (\"scaler\", StandardScaler()),\n        (\"classifier\", LogisticRegression(penalty=\"l2\", C=1.0))\n    ])\n    \n    pipeline.fit(X_train, y_train)\n    y_pred = pipeline.predict(X_test)\n    y_prob = pipeline.predict_proba(X_test)[:, 1]\n    \n    print(classification_report(y_test, y_pred))\n    print(f\"ROC-AUC Score: {roc_auc_score(y_test, y_prob):.4f}\")\n    return pipeline\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Relying on Accuracy with Imbalanced Data:** In a dataset with 99% healthy patients and 1% disease cases, a dumb model that always predicts \"healthy\" achieves 99% accuracy but is completely useless! Always look at Precision, Recall, and ROC-AUC.\n2. **Using MSE for Logistic Regression:** Mean Squared Error creates a non-convex loss surface with multiple local traps when combined with sigmoid. Always use Cross-Entropy loss!\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** In medical cancer detection, which metric is more critical to maximize: Precision or Recall?\n  * *Answer:* Recall, because a False Negative (missing a patient with cancer) is far more dangerous than a False Positive (which can be re-tested).\n* **Q2:** What does the Area Under the ROC Curve (ROC-AUC) measure?\n  * *Answer:* The probability that the classifier ranks a randomly chosen positive instance higher than a randomly chosen negative instance across all classification thresholds."
    },
    {
      "title": "Lecture 3: Deep Learning Foundations: Neural Networks & Backpropagation",
      "body": "## [SLIDE 1] 🎯 Artificial Neural Networks & Deep Learning\nDeep learning replaces manual feature engineering with hierarchical feature representations learned through stacked layers of artificial neurons.\n\n### 🎯 Key Learning Objectives\n* Understand the Artificial Neuron (Perceptron): Weights, Biases, and Activation functions.\n* Master Non-Linearity: Why activations (ReLU, Sigmoid, GELU) are essential.\n* Trace the Chain Rule of Calculus in Backpropagation.\n\n---\n\n## [SLIDE 2] 🧠 The Multi-Layer Perceptron (MLP)\n```text\nInput Layer (X)           Hidden Layer (h)           Output Layer (y)\n   (x1) ───────────►           (h1)          ───────────►   (y1)\n   (x2) ───────────►           (h2)          ───────────►   (y2)\n   (x3) ───────────►           (h3)\n```\nForward Pass:\n$$z^{[1]} = W^{[1]} X + b^{[1]}, \\quad a^{[1]} = \\text{ReLU}(z^{[1]})$$\n$$z^{[2]} = W^{[2]} a^{[1]} + b^{[2]}, \\quad \\hat{y} = \\text{Softmax}(z^{[2]})$$\n\n---\n\n## [SLIDE 3] 🏗️ Why Activation Functions are Mandatory\nWithout non-linear activation functions, stacking 1,000 linear layers collapses into a single linear equation:\n$$W_3(W_2(W_1 X)) = (W_3 W_2 W_1) X = W_{\\text{combined}} X$$\nActivation functions enable neural networks to approximate any continuous mathematical function (Universal Approximation Theorem).\n\n---\n\n## [SLIDE 4] 💻 Production Code: Backpropagation from Scratch\n```python\nimport numpy as np\n\ndef relu(z): return np.maximum(0, z)\ndef relu_deriv(z): return (z > 0).astype(float)\n\ndef train_mlp_step(X, y, W1, b1, W2, b2, lr=0.01):\n    m = X.shape[0]\n    \n    # Forward Pass\n    Z1 = np.dot(X, W1) + b1\n    A1 = relu(Z1)\n    Z2 = np.dot(A1, W2) + b2\n    y_pred = Z2  # Linear output\n    \n    # Backpropagation (Chain Rule)\n    dZ2 = (y_pred - y) / m\n    dW2 = np.dot(A1.T, dZ2)\n    db2 = np.sum(dZ2, axis=0, keepdims=True)\n    \n    dA1 = np.dot(dZ2, W2.T)\n    dZ1 = dA1 * relu_deriv(Z1)\n    dW1 = np.dot(X.T, dZ1)\n    db1 = np.sum(dZ1, axis=0, keepdims=True)\n    \n    # Gradient Descent Update\n    W1 -= lr * dW1\n    b1 -= lr * db1\n    W2 -= lr * dW2\n    b2 -= lr * db2\n    return W1, b1, W2, b2\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Vanishing Gradient Problem:** Using Sigmoid or Tanh in deep networks causes gradients to saturate near 0 for large inputs, halting learning. ReLU solves this by maintaining gradient 1 for positive activations.\n2. **Dying ReLU:** If learning rate is too high, neurons can become deactivated with negative inputs across all training data, outputting 0 forever. Leaky ReLU solves this.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What mathematical principle enables backpropagation in neural networks?\n  * *Answer:* The chain rule of differential calculus.\n* **Q2:** Why should neural network weights NOT be initialized to all zeros?\n  * *Answer:* Zero initialization causes all neurons in a layer to compute the exact same gradient, preventing symmetric feature differentiation."
    },
    {
      "title": "Lecture 4: PyTorch Deep Learning: Tensors, Autograd & GPU Acceleration",
      "body": "## [SLIDE 1] 🎯 Modern Deep Learning with PyTorch\nPyTorch is the premier deep learning framework used by Meta, OpenAI, and premier AI research labs for tensor computing and dynamic automatic differentiation.\n\n### 🎯 Key Learning Objectives\n* Master PyTorch Tensors and GPU execution (`.to('cuda')`).\n* Understand `torch.autograd` computational graphs.\n* Build neural networks using `nn.Module` and `torch.optim`.\n\n---\n\n## [SLIDE 2] 🧠 The PyTorch Training Loop\n```text\nFor each batch in DataLoader:\n  1. optimizer.zero_grad()    <-- Clear previous gradients!\n  2. outputs = model(inputs)  <-- Forward pass\n  3. loss = criterion(outputs, labels)\n  4. loss.backward()          <-- Autograd computes all partial derivatives!\n  5. optimizer.step()          <-- Update weights using Adam / SGD\n```\n\n---\n\n## [SLIDE 3] 🏗️ Popular Optimizers Compared\n| Optimizer | Momentum? | Adaptive Learning Rates? | Best Use Case |\n| :--- | :--- | :--- | :--- |\n| **SGD** | Optional | NO | Clean convergence on computer vision |\n| **Adam** | YES | YES (Calculates 1st & 2nd moments) | Default standard for deep networks |\n| **AdamW** | YES | YES (Decoupled weight decay) | Transformer models and modern LLMs |\n\n---\n\n## [SLIDE 4] 💻 Production Code: PyTorch Classifier\n```python\nimport torch\nimport torch.nn as nn\nimport torch.optim as optim\n\nclass NeuralClassifier(nn.Module):\n    def __init__(self, input_dim: int, hidden_dim: int, num_classes: int):\n        super().__init__()\n        self.net = nn.Sequential(\n            nn.Linear(input_dim, hidden_dim),\n            nn.BatchNorm1d(hidden_dim),\n            nn.ReLU(),\n            nn.Dropout(0.2),\n            nn.Linear(hidden_dim, num_classes)\n        )\n\n    def forward(self, x: torch.Tensor) -> torch.Tensor:\n        return self.net(x)\n\n# Setup device\ndevice = torch.device(\"cuda\" if torch.cuda.is_available() else \"cpu\")\nmodel = NeuralClassifier(20, 64, 2).to(device)\ncriterion = nn.CrossEntropyLoss()\noptimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-2)\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Forgetting `optimizer.zero_grad()`:** PyTorch accumulates gradients by default! Omitting `zero_grad()` sums gradients across multiple batches, corrupting weight updates.\n2. **Forgetting `model.eval()` and `torch.no_grad()`: ** During inference, failure to call `model.eval()` leaves Dropout and BatchNorm active, producing non-deterministic evaluation results.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What does `loss.backward()` do in PyTorch?\n  * *Answer:* Computes the gradients of the loss with respect to all graph leaves (parameters with `requires_grad=True`) using reverse-mode automatic differentiation.\n* **Q2:** What is the purpose of `nn.Dropout` during training?\n  * *Answer:* Randomly zeroes out neuron activations with probability $p$, preventing co-adaptation of features and mitigating overfitting."
    }
  ],
  "dailyLessons": [
    {
      "dayNumber": 1,
      "title": "ML Foundations: Supervised vs Unsupervised & Feature Engineering",
      "subtasks": [
        "Classify problems into regression, classification, clustering, or dimensionality reduction",
        "Perform feature scaling using StandardScaler and MinMaxScaler",
        "One-hot encode categorical features without introducing dummy variable traps",
        "Split datasets into train, validation, and test partitions"
      ],
      "notes": "# ML Taxonomy\\n\\nProper feature preprocessing and data hygiene are essential before training."
    },
    {
      "dayNumber": 2,
      "title": "Linear Regression: Cost Functions & Ordinary Least Squares",
      "subtasks": [
        "Formulate Mean Squared Error (MSE) cost function mathematically",
        "Derive normal equation (X^T X)^-1 X^T y",
        "Train linear regression model in Scikit-Learn",
        "Interpret model coefficients and R^2 score"
      ],
      "notes": "# Linear Regression\\n\\nLinear regression models relationships between input features and continuous targets."
    },
    {
      "dayNumber": 3,
      "title": "Gradient Descent: Batch, Stochastic & Mini-Batch",
      "subtasks": [
        "Implement Batch Gradient Descent on toy dataset",
        "Implement Stochastic Gradient Descent (SGD) and observe loss noise",
        "Compare mini-batch gradient descent throughput on CPU",
        "Tune learning rate schedule with step decay"
      ],
      "notes": "# Gradient Descent\\n\\nMini-batch gradient descent balances vectorization speed with regularizing stochastic noise."
    },
    {
      "dayNumber": 4,
      "title": "Overfitting & Regularization: Ridge (L2) & Lasso (L1)",
      "subtasks": [
        "Explain bias-variance tradeoff",
        "Apply Ridge regression (L2 penalty) to shrink weights",
        "Apply Lasso regression (L1 penalty) for automatic feature selection",
        "Tune regularization strength hyperparameter alpha with RidgeCV"
      ],
      "notes": "# Regularization\\n\\nL1 produces sparse weights (feature selection); L2 penalizes large weights."
    },
    {
      "dayNumber": 5,
      "title": "Multivariate Regression & Polynomial Features",
      "subtasks": [
        "Generate interaction and non-linear polynomial features with PolynomialFeatures",
        "Observe overfitting with high degree polynomials",
        "Plot learning curves across varying training set sizes",
        "Evaluate cross-validation scores using cross_val_score"
      ],
      "notes": "# Polynomial Regression\\n\\nHigh-degree polynomials capture non-linear patterns but risk severe overfitting."
    },
    {
      "dayNumber": 6,
      "title": "Housing Price Regression Milestone",
      "subtasks": [
        "Clean housing dataset and impute missing values",
        "Train regularized regression pipeline and achieve competitive RMSE",
        "Plot predicted vs actual price distributions",
        "Complete Week 1 Project: Housing Price Regression & Gradient Descent from Scratch"
      ],
      "notes": "# Regression Milestone Review\\n\\nLinear regression with feature scaling and L2 regularization forms the baseline for predictive systems."
    },
    {
      "dayNumber": 7,
      "title": "Logistic Regression: Odds Ratios & Sigmoid Function",
      "subtasks": [
        "Derive log-odds (logit) formulation",
        "Implement Sigmoid activation function in NumPy",
        "Train Logistic Regression classifier with Scikit-Learn",
        "Plot decision boundaries on 2D synthetic dataset"
      ],
      "notes": "# Logistic Regression\\n\\nLogistic regression models log-odds using the sigmoid function."
    },
    {
      "dayNumber": 8,
      "title": "Evaluation Metrics: Precision, Recall, F1 & ROC-AUC",
      "subtasks": [
        "Construct confusion matrix and calculate TP, FP, TN, FN",
        "Plot Precision-Recall curve on imbalanced dataset",
        "Calculate Area Under ROC Curve (ROC-AUC)",
        "Adjust classification probability decision thresholds"
      ],
      "notes": "# Evaluation Metrics\\n\\nAlways prioritize Precision, Recall, and ROC-AUC over raw accuracy on real-world datasets."
    },
    {
      "dayNumber": 9,
      "title": "Decision Trees: Entropy, Information Gain & Gini Impurity",
      "subtasks": [
        "Calculate Gini impurity and Information Gain manually",
        "Train DecisionTreeClassifier and visualize tree architecture",
        "Prune tree depth with max_depth and min_samples_split to prevent overfitting",
        "Extract feature importance rankings"
      ],
      "notes": "# Decision Trees\\n\\nTrees greedily split features to maximize information gain."
    },
    {
      "dayNumber": 10,
      "title": "Ensemble Learning: Random Forests & Bagging",
      "subtasks": [
        "Understand bootstrap aggregating (Bagging) variance reduction",
        "Train RandomForestClassifier with 100 estimators",
        "Evaluate Out-of-Bag (OOB) error score",
        "Compare Random Forest accuracy vs single Decision Tree"
      ],
      "notes": "# Random Forests\\n\\nEnsembles combine hundreds of decorrelated trees to reduce model variance."
    },
    {
      "dayNumber": 11,
      "title": "Gradient Boosting: XGBoost & LightGBM",
      "subtasks": [
        "Explain boosting principle: sequentially training trees to correct previous residual errors",
        "Train XGBoost classifier with early stopping",
        "Tune learning_rate, subsample, and max_depth hyperparameters",
        "Analyze SHAP (SHapley Additive exPlanations) values for model interpretability"
      ],
      "notes": "# Gradient Boosting\\n\\nGradient boosting trains sequential weak learners on negative loss gradients."
    },
    {
      "dayNumber": 12,
      "title": "Disease Diagnostics Classification Milestone",
      "subtasks": [
        "Train multi-class diagnostic classifier with cross-validation",
        "Produce detailed classification report and confusion matrix heatmap",
        "Export serialized model with joblib",
        "Complete Week 2 Project: Multi-Class Disease Diagnostics with Logistic Regression"
      ],
      "notes": "# Diagnostics Review\\n\\nTree ensembles and gradient boosting deliver state-of-the-art results on tabular data."
    },
    {
      "dayNumber": 13,
      "title": "Perceptrons & Artificial Neurons: Architecture & Forward Pass",
      "subtasks": [
        "Implement single artificial neuron in NumPy (dot product + bias + activation)",
        "Demonstrate why single-layer perceptrons fail to solve XOR problem",
        "Stack hidden layers to solve non-linear XOR boundary",
        "Compare activation functions (Sigmoid, Tanh, ReLU, LeakyReLU)"
      ],
      "notes": "# Neural Network Basics\\n\\nHidden layers with non-linear activations enable modeling arbitrary decision boundaries."
    },
    {
      "dayNumber": 14,
      "title": "Backpropagation: The Chain Rule & Gradient Computation",
      "subtasks": [
        "Derive partial derivatives for 2-layer neural network mathematically",
        "Implement backward pass propagating error gradients from output to input",
        "Verify gradient calculations using finite difference numerical gradient checking",
        "Plot loss trajectory over 1,000 training iterations"
      ],
      "notes": "# Backpropagation\\n\\nThe chain rule propagates error signals backward through network weights."
    },
    {
      "dayNumber": 15,
      "title": "PyTorch Basics: Tensors, Computations & Autograd",
      "subtasks": [
        "Create PyTorch tensors and explore operations (reshaping, broadcasting, dot products)",
        "Transfer tensors between CPU and CUDA GPU with .to(device)",
        "Compute automatic gradients using tensor.backward() and .grad attribute",
        "Detach tensors from computational graph using .detach() and torch.no_grad()"
      ],
      "notes": "# PyTorch Autograd\\n\\nPyTorch dynamically builds directed acyclic computational graphs for reverse-mode differentiation."
    },
    {
      "dayNumber": 16,
      "title": "Building PyTorch Models: nn.Module, Layers & Optimizers",
      "subtasks": [
        "Subclass nn.Module and define __init__ and forward methods",
        "Stack nn.Linear, nn.ReLU, and nn.BatchNorm1d layers",
        "Configure loss criteria (nn.CrossEntropyLoss, nn.MSELoss)",
        "Train model using torch.optim.AdamW optimizer"
      ],
      "notes": "# PyTorch Architecture\\n\\n`nn.Module` standardizes layer hierarchy and parameter tracking."
    },
    {
      "dayNumber": 17,
      "title": "PyTorch Data Loading: Dataset, DataLoader & Batching",
      "subtasks": [
        "Create custom PyTorch Dataset subclassing torch.utils.data.Dataset",
        "Batch and shuffle samples using DataLoader with num_workers",
        "Apply data augmentations using torchvision.transforms",
        "Profile data loading throughput to eliminate GPU starvation bottlenecks"
      ],
      "notes": "# Data Pipelines\\n\\n`DataLoader` provides multi-process batching, memory pinning, and shuffling."
    },
    {
      "dayNumber": 18,
      "title": "Neural Network from Scratch Milestone",
      "subtasks": [
        "Train Multi-Layer Perceptron on MNIST handwritten digit dataset",
        "Evaluate test set classification accuracy (>97%)",
        "Visualize learned weights in hidden layers",
        "Complete Week 3 Project: Deep Neural Network from Scratch with Backpropagation"
      ],
      "notes": "# Deep Learning Milestone Review\\n\\nUnderstanding raw backpropagation demystifies high-level PyTorch abstractions."
    },
    {
      "dayNumber": 19,
      "title": "Convolutional Neural Networks (CNN): Convolutions & Pooling",
      "subtasks": [
        "Explain 2D convolution kernel, stride, and padding operations",
        "Apply Max Pooling (nn.MaxPool2d) for spatial downsampling and translation invariance",
        "Build a CNN architecture (Conv2D -> ReLU -> MaxPool -> Dense)",
        "Calculate spatial feature map dimensions across layers"
      ],
      "notes": "# Convolutional Networks\\n\\nCNNs exploit spatial locality and weight sharing for computer vision."
    },
    {
      "dayNumber": 20,
      "title": "Deep CNNs & Transfer Learning: ResNet & Pretrained Models",
      "subtasks": [
        "Explain residual skip connections (ResNet) to prevent vanishing gradients",
        "Load pretrained ResNet-18 model from torchvision.models",
        "Freeze backbone weights and replace final classification head",
        "Fine-tune model on custom image dataset"
      ],
      "notes": "# Transfer Learning\\n\\nFine-tuning pretrained features drastically reduces training time and data requirements."
    },
    {
      "dayNumber": 21,
      "title": "Regularization in Deep Learning: Dropout, Weight Decay & Early Stopping",
      "subtasks": [
        "Add nn.Dropout layers to reduce co-adaptation of features",
        "Configure L2 weight decay in optimizer",
        "Implement early stopping to halt training when validation loss stops improving",
        "Save model checkpoints with torch.save()"
      ],
      "notes": "# Deep Regularization\\n\\nDropout, weight decay, and early stopping prevent overfitting in complex networks."
    },
    {
      "dayNumber": 22,
      "title": "Model Evaluation & Error Analysis in Deep Learning",
      "subtasks": [
        "Inspect high-loss failure cases and misclassified examples",
        "Plot training vs validation loss and accuracy curves",
        "Export confusion matrix and per-class precision metrics",
        "Quantize model weights to FP16 / INT8 for faster inference"
      ],
      "notes": "# Diagnostics & Quantization\\n\\nError analysis uncovers systematic data labeling and distribution drift issues."
    },
    {
      "dayNumber": 23,
      "title": "Inference Deployment: TorchScript, ONNX & FastAPI",
      "subtasks": [
        "Export PyTorch model to ONNX format",
        "Build a lightweight REST inference API with FastAPI",
        "Validate input payloads using Pydantic schemas",
        "Benchmark inference latency in milliseconds per request"
      ],
      "notes": "# Model Serving\\n\\nExporting to ONNX enables optimized hardware inference outside Python runtimes."
    },
    {
      "dayNumber": 24,
      "title": "Machine Learning Capstone: Production Delivery",
      "subtasks": [
        "Deploy trained vision model into containerized cloud service",
        "Test end-to-end image upload and inference response",
        "Export complete study deck and project documentation",
        "Complete Week 4 Capstone: PyTorch Image Classifier & REST Inference Microservice"
      ],
      "notes": "# AI Mastery\\n\\nCongratulations! You have mastered machine learning, neural networks, PyTorch, and model deployment."
    }
  ]
};
