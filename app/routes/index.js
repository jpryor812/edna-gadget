// app/routes/index.js
import React from "react";
import { Page, Card, Text } from "@shopify/polaris";

export default function Index() {
  return (
    <Page title="Chatbot Admin">
      <Card sectioned>
        <Text variant="bodyLg">
          Your AI Chatbot is successfully installed and running!
        </Text>
        <Text variant="bodyMd">
          The chatbot is active on your storefront. This admin panel will be expanded with more features soon.
        </Text>
      </Card>
    </Page>
  );
}