import {useState} from 'react'
import { Card } from '../ui/card'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { login } from '@/lib/utils'

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] =  useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    let hasError = false;

    if(!email){
      setEmailError("Email is required")
      hasError = true;
    } else if (!validateEmail(email)) {
      hasError = true;
    }

    if(!password){
      setPasswordError("Password is required")
      hasError = true;
    } else {
      setPasswordError("");
    }

    if (hasError){
      return
    }

    try {
      setIsLoading(true);
      await login(email, password)
      window.location.reload();
    } catch (error) {
      setPasswordError("Invalid email or password")
    } finally {
      setIsLoading(false);
    }
  } 

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = re.test(String(email).toLowerCase()) || email === "Administrator";
    if(!isValid){
      setEmailError("Invalid email")
    }else{
      setEmailError("")
    }
    return isValid;
  }

  return (
    <Card className="px-6">
      <form onSubmit={handleLogin} className="space-y-4 py-6">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input 
          className="w-[20vw]" 
          placeholder="Enter your email" 
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (emailError) {
              setEmailError("")
            }
          }}
          onBlur={() => validateEmail(email)} /> 
        </div>
        {
          emailError && <p className="text-sm text-red-500">{emailError}</p>
        }
        <div className="space-y-2">
          <Label>Password</Label>
          <Input 
          className="w-[20vw]" 
          placeholder="Enter your password" 
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (passwordError){
              setPasswordError("")
            }
          }} />
        </div>
        {          
          passwordError && <p className="text-sm text-red-500">{passwordError}</p>
        }
        <Button block disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log In"}
        </Button>
      </form>
    </Card>
  );
}

export default Login
