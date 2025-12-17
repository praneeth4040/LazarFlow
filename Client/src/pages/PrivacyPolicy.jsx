import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
    return (
        <div className="privacy-container">
            <SEO
                title="Privacy Policy - LazarFlow"
                description="LazarFlow Privacy Policy explaining how we collect, use, and protect your information."
                keywords="privacy policy, data protection, lazarflow"
                url="https://lazarflow.com/privacy"
            />

            <header className="privacy-header">
                <div className="header-content">
                    <h1>Privacy Policy</h1>
                    <Link to="/" className="back-link">Back to Home</Link>
                </div>
            </header>

            <main className="privacy-content">
                <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>

                <section>
                    <h2>1. Introduction</h2>
                    <p>At LazarFlow, we value your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our esports tournament management services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.</p>
                </section>

                <section>
                    <h2>2. Information We Collect</h2>
                    <p>We collect information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products and services, when you participate in activities on the website, or otherwise when you contact us.</p>
                    <ul>
                        <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us.</li>
                        <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.</li>
                    </ul>
                </section>

                <section>
                    <h2>3. Use of Your Information</h2>
                    <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. We may use information collected about you via the Site to:</p>
                    <ul>
                        <li>Create and manage your account.</li>
                        <li>Process your transactions and send you related information, including transaction confirmations and invoices.</li>
                        <li>Email you regarding your account or order.</li>
                        <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Site.</li>
                        <li>Generate a personal profile about you to make future visits to the Site more personalized.</li>
                        <li>Increase the efficiency and operation of the Site.</li>
                        <li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
                        <li>Perform other business activities as needed.</li>
                        <li>Internal research and development purposes, including but not limited to the training, tuning, and improvement of our machine learning models and algorithms to enhance the accuracy and performance of our services.</li>
                    </ul>
                </section>

                <section>
                    <h2>4. Disclosure of Your Information</h2>
                    <p>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
                    <ul>
                        <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.</li>
                    </ul>
                </section>

                <section>
                    <h2>5. Security of Your Information</h2>
                    <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>
                </section>

                <section>
                    <h2>6. Contact Us</h2>
                    <p>If you have questions or comments about this Privacy Policy, please contact us at support@lazarflow.app.</p>
                </section>
            </main>

            <footer className="privacy-footer">
                <p>&copy; {new Date().getFullYear()} LazarFlow. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default PrivacyPolicy;
