import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import toast from 'react-hot-toast'
import { Mail, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Register() {
  const [form,    setForm]    = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [show,    setShow]    = useState(false)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate      = useNavigate()

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password !== form.password_confirmation) {
      toast.error('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password, form.password_confirmation)
      navigate('/integrations')
      toast.success('Welcome to BeyondChats! Connect your Gmail to get started.')
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) {
        Object.values(errors).flat().forEach(msg => toast.error(msg))
      } else {
        toast.error(err.response?.data?.message || 'Registration failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg shadow-brand-200">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">BeyondChats</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Create your free account</p>
        </div>

        <div className="card p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" name="name" type="text" autoComplete="name" required
                className="input" placeholder="Jane Doe"
                value={form.name} onChange={handleChange} />
            </div>

            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required
                className="input" placeholder="you@example.com"
                value={form.email} onChange={handleChange} />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" name="password" type={show ? 'text' : 'password'}
                  autoComplete="new-password" required minLength={8}
                  className="input pr-10" placeholder="Min 8 characters"
                  value={form.password} onChange={handleChange} />
                <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password_confirmation">Confirm password</label>
              <input id="password_confirmation" name="password_confirmation"
                type={show ? 'text' : 'password'} autoComplete="new-password" required
                className="input" placeholder="Repeat password"
                value={form.password_confirmation} onChange={handleChange} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
