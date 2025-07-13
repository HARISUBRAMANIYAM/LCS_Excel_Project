import axios from "axios";
import React, { useState } from "react";
import { Alert, Button, Container, Form } from "react-bootstrap";

const FeedbackForm: React.FC = () => {
    const [email, setEmail] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess(null);
        setError(null);

        if (!email || !message) {
            setError("Both fields are required.");
            return;
        }

        try {
            setLoading(true);
            await axios.post("http://localhost:8000/email", {
                email: [email],
                message: message
            });

            setSuccess("Feedback sent successfully!");
            setEmail("");
            setMessage("");
        } catch (err: any) {
            setError("Failed to send feedback. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="auth-form-container" style={{ maxWidth: "600px" }}>
            <h3 className="mb-4">Send Feedback</h3>
            {success && <Alert variant="success">{success}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
                <Form.Group controlId="formEmail" className="mb-3">
                    <Form.Label>Email address</Form.Label>
                    <Form.Control
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group controlId="formMessage" className="mb-3">
                    <Form.Label>Feedback Message</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={5}
                        placeholder="Write your feedback here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                    />
                </Form.Group>

                <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? "Sending..." : "Send Feedback"}
                </Button>
            </Form>
        </Container>
    );
};

export default FeedbackForm;
