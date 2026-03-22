import { useState, type SubmitEvent } from "react";

const FeedbackForm = () => {
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<Error>();

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append("feedback", feedback);
    formData.append("access_key", import.meta.env.PUBLIC_FORM_ACCESS_KEY);

    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.status != 200) {
          throw Error(
            `Expected response status 200, got ${response.status}: ${response.statusText}`,
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
    return <p className="font-bold text-green-700">Submitted!</p>;
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <p className="font-semibold text-red-700">
          Something went wrong, error message {error.message}. Please reach out
          to me{" "}
          <a className="underline" href="https://linkedin.com/in/mihailmarian">
            on LinkedIn
          </a>{" "}
          instead.
        </p>
      )}
      <textarea
        rows={3}
        className="block w-full rounded border border-black p-2 focus:ring-cyan-800"
        value={feedback}
        onChange={(event) => {
          setFeedback(event.target.value);
        }}
        placeholder="Feed me feedback..."
        required
      ></textarea>
      <button
        type="submit"
        className={
          (isLoading ? "bg-gray-600" : "bg-blue-800 hover:bg-blue-950") +
          ` w-full rounded px-10 py-2 font-semibold text-white md:w-40`
        }
        disabled={isLoading}
      >
        {isLoading ? "..." : "Submit"}
      </button>
    </form>
  );
};

export default FeedbackForm;
