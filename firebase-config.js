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

// 6 Standard Curated Meals for Guests & New User Initial Seed
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

// Meal Data Service API (Strict User Isolation)
const MealService = {
  isCloudConnected: function() {
    return db !== null;
  },

  // Returns Firestore collection ONLY for logged-in users.
  // Guests return null to ensure they only see curated meals and never pollute global database!
  getMealsCollection: function() {
    if (!db) return null;
    const user = auth ? auth.currentUser : null;
    if (user) {
      return db.collection('users').doc(user.uid).collection('meals');
    }
    return null;
  },

  getGuestMeals: function() {
    const local = localStorage.getItem('mp_guest_meals');
    if (local) {
      try { return JSON.parse(local); } catch(e) {}
    }
    // Default to the 6 curated meals for guests
    localStorage.setItem('mp_guest_meals', JSON.stringify(DEFAULT_MEALS));
    return DEFAULT_MEALS;
  },

  saveGuestMeals: function(meals) {
    localStorage.setItem('mp_guest_meals', JSON.stringify(meals));
  },

  getMeals: async function() {
    const collection = this.getMealsCollection();
    if (collection) {
      try {
        const snapshot = await collection.get();
        if (!snapshot.empty) {
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
          // Seed new user account with initial 6 standard meals
          for (let meal of DEFAULT_MEALS) {
            await collection.doc(meal.id).set(meal).catch(e => {});
          }
          return DEFAULT_MEALS;
        }
      } catch (e) {
        console.warn("Firestore getMeals error, reading guest meals:", e);
      }
    }
    return this.getGuestMeals();
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
          console.warn("Firestore subscription error. Falling back to local guest meals:", err);
          onUpdate(this.getGuestMeals());
        });
      } catch(e) {
        console.warn("Subscription failed to initialize, falling back:", e);
        onUpdate(this.getGuestMeals());
        return null;
      }
    }
    
    // For Guests: Immediately return the 6 standard curated meals!
    onUpdate(this.getGuestMeals());
    return null;
  },

  addMeal: async function(meal) {
    const newMeal = { id: meal.id || Date.now().toString(), ...meal };
    
    const collection = this.getMealsCollection();
    if (collection) {
      try {
        await collection.doc(newMeal.id).set(newMeal);
      } catch (e) {
        console.warn("Firestore addMeal failed:", e);
      }
    } else {
      // Guest mode local save
      const meals = this.getGuestMeals();
      meals.push(newMeal);
      this.saveGuestMeals(meals);
    }
    
    return newMeal;
  },

  updateMeal: async function(id, updatedData) {
    const updatedMeal = { id, ...updatedData };
    
    const collection = this.getMealsCollection();
    if (collection) {
      try {
        await collection.doc(id).set(updatedMeal, { merge: true });
      } catch (e) {
        console.warn("Firestore updateMeal failed:", e);
      }
    } else {
      // Guest mode local update
      const meals = this.getGuestMeals();
      const index = meals.findIndex(m => m.id === id);
      if (index !== -1) {
        meals[index] = { ...meals[index], ...updatedData };
        this.saveGuestMeals(meals);
      }
    }

    return updatedMeal;
  },

  deleteMeal: async function(id) {
    const collection = this.getMealsCollection();
    if (collection) {
      try {
        await collection.doc(id).delete();
      } catch (e) {
        console.warn("Firestore deleteMeal failed:", e);
      }
    } else {
      // Guest mode local delete
      let meals = this.getGuestMeals();
      meals = meals.filter(m => m.id !== id);
      this.saveGuestMeals(meals);
    }

    return true;
  },

  resetGuestToStandard: function() {
    localStorage.setItem('mp_guest_meals', JSON.stringify(DEFAULT_MEALS));
    return DEFAULT_MEALS;
  }
};
