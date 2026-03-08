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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950">

      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="animate-float absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-500 to-indigo-400 opacity-40 blur-3xl" />
        <div className="animate-float-rev absolute bottom-0 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 opacity-35 blur-3xl" />
        <div className="animate-float absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-pink-400 to-indigo-500 opacity-30 blur-3xl" style={{animationDelay: '4s'}} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fade-in-up stagger-1">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-2xl mb-4 shadow-xl shadow-brand-500/30">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">BeyondChats</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Create your free account</p>
        </div>

        <div className="rounded-3xl p-8 shadow-2xl animate-fade-in-up stagger-2" style={{background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.6)'}}>
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

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
