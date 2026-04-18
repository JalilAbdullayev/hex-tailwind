import axios from "axios";
import { useState, type ChangeEvent, type SubmitEvent } from "react";

const FeedbackForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<Error>();

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("feedback", feedback);
    formData.append("access_key", import.meta.env.PUBLIC_FORM_ACCESS_KEY);

    axios
      .post("https://api.web3forms.com/submit", formData)
      .then((res) => {
        if (res.status != 200) {
          throw Error(
            `Expected response status 200, got ${res.status}: ${res.statusText}`,
          );
        }
      })
      .then(() => setSubmitted(true))
      .catch((error: Error) => {
        setError(error);
        setIsLoading(false);
      });
  };

  if (submitted) {
    return (
      <p className="font-bold text-green-700 dark:text-green-400">Submitted!</p>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <p className="font-semibold text-red-700 dark:text-red-400">
          Something went wrong, error message: {error.message}. Please reach out
          to me{" "}
          <a
            className="underline"
            href="https://linkedin.com/in/jalil-abdullayev/"
            target="_blank"
          >
            on LinkedIn
          </a>{" "}
          instead.
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <input
          type="text"
          className="block w-full rounded-2xl border border-slate-200 bg-white/60 px-5 py-3.5 text-slate-800 placeholder-slate-400 shadow-sm transition-all hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder-slate-500 dark:hover:bg-slate-800 dark:focus:border-indigo-500 dark:focus:bg-slate-800"
          value={name}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setName(event.target.value)
          }
          placeholder="Your Name"
          required
        />
        <input
          type="email"
          className="block w-full rounded-2xl border border-slate-200 bg-white/60 px-5 py-3.5 text-slate-800 placeholder-slate-400 shadow-sm transition-all hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder-slate-500 dark:hover:bg-slate-800 dark:focus:border-indigo-500 dark:focus:bg-slate-800"
          value={email}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setEmail(event.target.value)
          }
          placeholder="Your E-mail"
          required
        />
      </div>
      <textarea
        rows={4}
        className="block w-full rounded-2xl border border-slate-200 bg-white/60 px-5 py-4 text-slate-800 placeholder-slate-400 shadow-sm transition-all hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder-slate-500 dark:hover:bg-slate-800 dark:focus:border-indigo-500 dark:focus:bg-slate-800"
        value={feedback}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          setFeedback(event.target.value)
        }
        placeholder="How can we improve HEX to Tailwind?"
        required
      ></textarea>
      <button
        type="submit"
        className={
          (isLoading
            ? "cursor-not-allowed bg-slate-400 dark:bg-slate-700"
            : "bg-indigo-600 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg active:translate-y-0 dark:bg-indigo-500 dark:hover:bg-indigo-400") +
          ` w-full rounded-xl px-10 py-3.5 font-semibold text-white shadow-md transition-all md:w-auto`
        }
        disabled={isLoading}
      >
        {isLoading ? "Submitting..." : "Submit Feedback"}
      </button>
    </form>
  );
};

export default FeedbackForm;
