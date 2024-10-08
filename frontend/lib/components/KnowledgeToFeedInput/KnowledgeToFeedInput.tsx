import { useTranslation } from "react-i18next";

import Button from "@/lib/components/ui/Button";
import { useKnowledgeToFeedContext } from "@/lib/context/KnowledgeToFeedProvider/hooks/useKnowledgeToFeedContext";

import { FeedItems } from "./components";
import { Crawler } from "./components/Crawler";
import { FileUploader } from "./components/FileUploader";
import GoogleDrive from "./components/GoogleDriveHelper";
import DropBox from "./components/DropBoxHelper";
import { Col, Row } from "antd";

export const KnowledgeToFeedInput = ({
  feedBrain,
}: {
  feedBrain: () => void;
}): JSX.Element => {
  const { t } = useTranslation(["translation", "upload"]);

  const { knowledgeToFeed } = useKnowledgeToFeedContext();

  return (
    <div>
        <Row className="flex-row justify-between items-center mt-5">
          <Col lg={3} md={24} sm={24} span={24} className="flex justify-center mt-5 mb-5">
            <GoogleDrive />
          </Col>
          <Col lg={5} md={24} sm={24} span={24} className="flex justify-center mt-5 mb-5">
            <DropBox />
          </Col>
          <Col lg={4} md={24} sm={24} span={24} className="flex justify-center mt-5 mb-5">
            <FileUploader />
          </Col>
          <Col lg={2} md={24} sm={24} span={24} className="flex justify-center mt-5 mb-5">
            <span className="whitespace-nowrap	">
              {`${t("and", { ns: "translation" })} / ${t("or", {
                ns: "translation",
              })}`}
            </span>
          </Col>
          <Col lg={6} md={24} sm={24} span={24} className="flex justify-center mt-5 mb-5">
            <Crawler />
          </Col>
        </Row>
      <FeedItems />
      <div className="flex justify-center mt-5">
        <Button
          disabled={knowledgeToFeed.length === 0}
          className="rounded-xl bg-primary border-white"
          onClick={() => void feedBrain()}
          data-testid="submit-feed-button"
        >
          {t("feed_form_submit_button", { ns: "upload" })}
        </Button>
      </div>
    </div>
  );
};
