const API_URL = "https://api.yoursite.com"

/* LOGIN */

async function login(username, password){

try{

const response = await fetch(`${API_URL}/login`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
username:username,
password:password
})

})

const data = await response.json()

if(response.ok){

localStorage.setItem("token", data.token)

window.location.href = "/feed.html"

}else{

alert(data.message || "Login error")

}

}catch(err){

console.error(err)
alert("Server error")

}

}

/* REGISTER */

async function register(username, email, password){

try{

const response = await fetch(`${API_URL}/register`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
username:username,
email:email,
password:password
})

})

const data = await response.json()

if(response.ok){

alert("Account created")

window.location.href = "/index.html"

}else{

alert(data.message || "Registration error")

}

}catch(err){

console.error(err)
alert("Server error")

}

}
