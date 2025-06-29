// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCW41kfZanNe4PERnMTCsP_XkL4U1XCQ1Q",
  authDomain: "pemilu-210f7.firebaseapp.com",
  databaseURL: "https://pemilu-210f7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pemilu-210f7",
  storageBucket: "pemilu-210f7.firebasestorage.app",
  messagingSenderId: "530335513266",
  appId: "1:530335513266:web:d6004bdad8b214ded027ab"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Candidate names mapping
const candidateNames = {
  '1': 'Ahmad Fauzan',
  '2': 'Siti Nurhaliza',
  '3': 'Budi Santoso',
  '4': 'Dewi Anggraini',
  '5': 'Reza Pratama'
};

// Page Navigation
document.addEventListener('DOMContentLoaded', function() {
  const loginPage = document.getElementById('loginPage');
  const votingPage = document.getElementById('votingPage');
  const thankYouPage = document.getElementById('thankYouPage');
  const confirmationModal = document.getElementById('confirmationModal');
  
  function showPage(page) {
    [loginPage, votingPage, thankYouPage].forEach(p => {
      p.classList.remove('active');
    });
    page.classList.add('active');
    window.scrollTo(0, 0);
  }
  
  window.showPage = showPage;
  window.showModal = function() {
    confirmationModal.classList.remove('hidden');
  };
  window.hideModal = function() {
    confirmationModal.classList.add('hidden');
  };
});

// Login Handler
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const nisnInput = document.getElementById('nisn');
  const nipdInput = document.getElementById('nipd');
  const nisnError = document.getElementById('nisnError');
  const nipdError = document.getElementById('nipdError');
  const loginError = document.getElementById('loginError');
  const voterNameElement = document.getElementById('voterName');
  
  // Fungsi untuk mereset form login
  function resetLoginForm() {
    loginForm.reset();
    nisnError.classList.add('hidden');
    nipdError.classList.add('hidden');
    loginError.classList.add('hidden');
  }
  
  nisnInput.addEventListener('input', function() {
    if (this.value.length > 0 && (this.value.length !== 10 || !/^\d+$/.test(this.value))) {
      nisnError.classList.remove('hidden');
    } else {
      nisnError.classList.add('hidden');
    }
  });

  nipdInput.addEventListener('input', function() {
    if (this.value.length > 0 && !/^\d+$/.test(this.value)) {
      nipdError.classList.remove('hidden');
    } else {
      nipdError.classList.add('hidden');
    }
  });
  
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const nisn = nisnInput.value.trim();
    const nipd = nipdInput.value.trim();
    
    // Validate inputs
    if (nisn.length !== 10 || !/^\d+$/.test(nisn)) {
      nisnError.classList.remove('hidden');
      return;
    }
    
    if (nipd.length === 0 || !/^\d+$/.test(nipd)) {
      nipdError.classList.remove('hidden');
      return;
    }
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Memproses...';
    submitBtn.disabled = true;
    
    try {
      // Check if already voted
      const hasVoted = await checkIfAlreadyVoted(nisn, nipd);
      
      if (hasVoted) {
        loginError.textContent = "Anda sudah melakukan voting sebelumnya";
        loginError.classList.remove('hidden');
      } else {
        // Store voter data in session
        const voterData = {
          nisn: nisn,
          nipd: nipd
        };
        sessionStorage.setItem('voterData', JSON.stringify(voterData));
        
        // Update voter name display
        if (voterNameElement) {
          voterNameElement.textContent = nisn;
        }
        
        window.showPage(document.getElementById('votingPage'));
      }
    } catch (error) {
      console.error("Error:", error);
      loginError.textContent = "Terjadi kesalahan, silakan coba lagi";
      loginError.classList.remove('hidden');
    } finally {
      submitBtn.innerHTML = 'Masuk';
      submitBtn.disabled = false;
      resetLoginForm();
    }
  });
  
  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', function() {
    sessionStorage.removeItem('voterData');
    resetLoginForm();
    window.showPage(document.getElementById('loginPage'));
  });
  
  // Back to login button
  document.getElementById('backToLoginBtn').addEventListener('click', function() {
    sessionStorage.removeItem('voterData');
    resetLoginForm();
    window.showPage(document.getElementById('loginPage'));
  });
  
  // Reset form saat pertama kali load
  resetLoginForm();
});

// Check if user already voted
async function checkIfAlreadyVoted(nisn, nipd) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const snapshot = await database.ref(`Pemilu/${today}/${nisn}`)
    .orderByChild('nisn')
    .equalTo(nisn)
    .once('value');
  
  if (snapshot.exists()) {
    let hasVoted = false;
    snapshot.forEach(childSnapshot => {
      if (childSnapshot.val().nipd === nipd) {
        hasVoted = true;
      }
    });
    return hasVoted;
  }
  return false;
}

// Voting Handler
document.addEventListener('DOMContentLoaded', async function() {
  const votingForm = document.getElementById('votingForm');
  const confirmationModal = document.getElementById('confirmationModal');
  const selectedCandidateSpan = document.getElementById('selectedCandidate');
  const cancelVoteBtn = document.getElementById('cancelVote');
  const confirmVoteBtn = document.getElementById('confirmVote');
  
  votingForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const selectedCandidate = document.querySelector('input[name="candidate"]:checked');
    
    if (!selectedCandidate) {
      alert('Silakan pilih salah satu kandidat');
      return;
    }
    
    selectedCandidateSpan.textContent = candidateNames[selectedCandidate.value];
    window.showModal();
  });
  
  cancelVoteBtn.addEventListener('click', function() {
    window.hideModal();
  });
  
  confirmVoteBtn.addEventListener('click', async function() {
    const selectedCandidate = document.querySelector('input[name="candidate"]:checked');
    const voterData = JSON.parse(sessionStorage.getItem('voterData'));
    
    if (!selectedCandidate || !voterData) {
      alert('Terjadi kesalahan, silakan coba lagi');
      return;
    }
    
    confirmVoteBtn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Memproses...';
    confirmVoteBtn.disabled = true;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
      
      const voteData = {
        NIPD: voterData.nipd,
        Kandidat: selectedCandidate.value,
        NamaKandidat: candidateNames[selectedCandidate.value],
        Waktu: now
      };
      
      // Save to Firebase
      await database.ref(`Pemilu/${today}/${voterData.nisn}`).set(voteData);
      
      // Show thank you page
      window.hideModal();
      window.showPage(document.getElementById('thankYouPage'));
      createConfetti();
      votingForm.reset();
      
      // Clear session data
      sessionStorage.removeItem('voterData');
    } catch (error) {
      console.error("Error saving vote:", error);
      alert('Gagal menyimpan pilihan, silakan coba lagi');
    } finally {
      confirmVoteBtn.innerHTML = 'Konfirmasi';
      confirmVoteBtn.disabled = false;
    }
  });
});

// Create confetti effect
function createConfetti() {
  const confettiContainer = document.getElementById('confettiContainer');
  const colors = ['#1E88E5', '#FF9800', '#4CAF50', '#E91E63', '#9C27B0'];
  confettiContainer.innerHTML = '';
  
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.width = Math.random() * 10 + 5 + 'px';
    confetti.style.height = Math.random() * 10 + 5 + 'px';
    confetti.style.opacity = Math.random();
    confetti.style.animationDelay = Math.random() * 3 + 's';
    confetti.style.animationDuration = Math.random() * 2 + 3 + 's';
    confettiContainer.appendChild(confetti);
  }
}