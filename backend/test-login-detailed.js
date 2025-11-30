const testLogin = async () => {
  try {
    const body = {
      emailOrStudentId: "admin@eduportal.com",
      password: "admin123"
    };
    
    console.log('Testing login with:', body);
    
    const response = await fetch('http://localhost:5000/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response body:', data);
    
    if (response.ok) {
      const jsonData = JSON.parse(data);
      console.log('Login successful!');
      console.log('Token:', jsonData.token ? 'Present' : 'Missing');
      console.log('User:', jsonData.user);
    } else {
      console.log('Login failed');
    }
    
  } catch (error) {
    console.error('Error testing login:', error);
  }
};

testLogin();
