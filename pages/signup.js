import axios from "axios";
import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const value =
      event.target.name === "phone"
        ? event.target.value.replace(/\D/g, "").slice(0, 10)
        : event.target.value;
    setForm((current) => ({ ...current, [event.target.name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await axios.post("/api/auth/register", form);
      toast.success("Account created successfully");
      await router.push("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell auth-page">
      <h1>Signup</h1>
      <form className="auth-card" onSubmit={handleSubmit}>
        <label htmlFor="name">Full Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          minLength={2}
          autoComplete="name"
          required
        />

        <label htmlFor="phone">Mobile Number</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          pattern="[6-9][0-9]{9}"
          maxLength={10}
          value={form.phone}
          onChange={handleChange}
          autoComplete="tel"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          minLength={6}
          autoComplete="new-password"
          required
        />

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Signup"}
        </button>
      </form>
    </main>
  );
}
