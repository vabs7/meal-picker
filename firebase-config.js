// Firebase Configuration & Service Layer for Meal Picker

const firebaseConfig = {
    apiKey: "AIzaSyBVSk3aTPPkRIqtwJ1vp3RVF_vXgPPW7hI",
    authDomain: "meal-picker-195d8.firebaseapp.com",
    projectId: "meal-picker-195d8",
    storageBucket: "meal-picker-195d8.firebasestorage.app",
    messagingSenderId: "294902921579",
    appId: "1:294902921579:web:6bd8f64ddca5ca128ff42e",
    measurementId: "G-N8170B6RRT"
};

const isFirebaseConfigured = function() {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};

let db = null;
let auth = null;

if (typeof firebase !== 'undefined' && isFirebaseConfigured()) {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    console.log("Firebase initialized with Firestore and Auth.");
  } catch (e) {
    console.warn("Firebase initialization failed, falling back to LocalStorage:", e);
  }
}

const DEFAULT_MEALS = [
  {
    id: '1',
    name: 'Sheet Pan Garlic Butter Salmon & Asparagus',
    category: 'Seafood',
    ingredients: '2 salmon fillets, 1 bunch asparagus, 4 tbsp butter, 3 cloves garlic, lemon, salt, pepper',
    notes: 'Bake at 400°F (200°C) for 12-15 minutes. Super quick cleanup!'
  },
  {
    id: '2',
    name: 'Classic 30-Minute Skillet Lasagna',
    category: 'Pasta',
    ingredients: 'Broken lasagna noodles, 1 lb ground turkey/beef, marinara sauce, ricotta, mozzarella, parmesan',
    notes: 'All the comfort of lasagna in a single skillet without layering hassle.'
  },
  {
    id: '3',
    name: 'Crispy Honey Garlic Chicken Stir-Fry',
    category: 'Asian',
    ingredients: 'Chicken breast cubed, broccoli florets, bell peppers, soy sauce, honey, ginger, garlic, cornstarch',
    notes: 'Serve over steaming jasmine rice or cauliflower rice.'
  },
  {
    id: '4',
    name: 'Cozy Creamy Tomato Basil Soup & Grilled Cheese',
    category: 'Comfort Food',
    ingredients: 'Canned crushed tomatoes, heavy cream, vegetable broth, fresh basil, sourdough, sharp cheddar',
    notes: 'The ultimate rainy night or hectic weeknight comfort food.'
  },
  {
    id: '5',
    name: 'Zesty Shrimp Tacos with Avocado Slaw',
    category: 'Mexican',
    ingredients: '1 lb peeled shrimp, taco seasoning, corn tortillas, shredded cabbage, lime, mayonnaise, cilantro',
    notes: 'Top with quick pickled red onions if available.'
  },
  {
    id: '6',
    name: 'One-Pot Creamy Tuscan Chicken Pasta',
    category: 'Pasta',
    ingredients: 'Chicken breasts, penne pasta, sun-dried tomatoes, baby spinach, garlic, parmesan, heavy cream',
    notes: 'Everything cooks in one pot for maximum flavor and easy washing.'
  }
];

// Authentication API Helper
const AuthService = {
  getCurrentUser: function() {
    return auth ? auth.currentUser : null;
  },

  onAuthStateChanged: function(callback) {
    if (auth) {
      return auth.onAuthStateChanged(callback);
    } else {
      callback(null);
      return () => {};
    }
  },

  signUp: async function(email, password, displayName) {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    if (displayName && userCredential.user) {
      await userCredential.user.updateProfile({ displayName: displayName });
    }
    return userCredential.user;
  },

  signIn: async function(email, password) {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return userCredential.user;
  },

  signInWithGoogle: async function() {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const provider = new firebase.auth.GoogleAuthProvider();
    const userCredential = await auth.signInWithPopup(provider);
    return userCredential.user;
  },

  signOut: async function() {
    if (auth) {
      await auth.signOut();
    }
  }
};

// Meal Data Service API (User-scoped in Firestore or LocalStorage fallback)
const MealService = {
  isCloudConnected: function() {
    return db !== null;
  },

  getMealsCollection: function() {
    if (!db) return null;
    const user = auth ? auth.currentUser : null;
    if (user) {
      return db.collection('users').doc(user.uid).collection('meals');
    }
    return db.collection('meals');
  },

  getLocalStorageMeals: function() {
    const local = localStorage.getItem('mp_meals');
    if (local) {
      try { return JSON.parse(local); } catch(e) {}
    }
    localStorage.setItem('mp_meals', JSON.stringify(DEFAULT_MEALS));
    return DEFAULT_MEALS;
  },

  getMeals: async function() {
    const collection = this.getMealsCollection();
    if (collection) {
      try {
        const snapshot = await collection.get();
        if (!snapshot.empty) {
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
          for (let meal of DEFAULT_MEALS) {
            await collection.doc(meal.id).set(meal).catch(e => {});
          }
          return DEFAULT_MEALS;
        }
      } catch (e) {
        console.warn("Firestore getMeals error, reading LocalStorage:", e);
      }
    }
    return this.getLocalStorageMeals();
  },

  subscribeMeals: function(onUpdate) {
    const collection = this.getMealsCollection();
    if (collection) {
      try {
        return collection.onSnapshot(async snapshot => {
          if (snapshot.empty) {
            for (let meal of DEFAULT_MEALS) {
              await collection.doc(meal.id).set(meal).catch(e => {});
            }
            onUpdate(DEFAULT_MEALS);
          } else {
            const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            onUpdate(meals);
          }
        }, err => {
          console.warn("Firestore subscription permission/network error. Falling back to LocalStorage:", err);
          onUpdate(this.getLocalStorageMeals());
        });
      } catch(e) {
        console.warn("Subscription failed to initialize, falling back:", e);
        onUpdate(this.getLocalStorageMeals());
        return null;
      }
    }
    
    // Immediate callback for local storage
    onUpdate(this.getLocalStorageMeals());
    return null;
  },

  addMeal: async function(meal) {
    const collection = this.getMealsCollection();
    if (collection) {
      try {
        const docRef = await collection.add(meal);
        return { id: docRef.id, ...meal };
      } catch (e) {
        console.warn("Firestore addMeal failed, saving locally:", e);
      }
    }
    
    const meals = this.getLocalStorageMeals();
    const newMeal = { id: Date.now().toString(), ...meal };
    meals.push(newMeal);
    localStorage.setItem('mp_meals', JSON.stringify(meals));
    return newMeal;
  },

  updateMeal: async function(id, updatedData) {
    const collection = this.getMealsCollection();
    if (collection) {
      try {
        await collection.doc(id).update(updatedData);
        return { id, ...updatedData };
      } catch (e) {
        console.warn("Firestore updateMeal failed, updating locally:", e);
      }
    }

    const meals = this.getLocalStorageMeals();
    const index = meals.findIndex(m => m.id === id);
    if (index !== -1) {
      meals[index] = { ...meals[index], ...updatedData };
      localStorage.setItem('mp_meals', JSON.stringify(meals));
    }
    return { id, ...updatedData };
  },

  deleteMeal: async function(id) {
    const collection = this.getMealsCollection();
    if (collection) {
      try {
        await collection.doc(id).delete();
        return true;
      } catch (e) {
        console.warn("Firestore deleteMeal failed, deleting locally:", e);
      }
    }

    let meals = this.getLocalStorageMeals();
    meals = meals.filter(m => m.id !== id);
    localStorage.setItem('mp_meals', JSON.stringify(meals));
    return true;
  }
};
