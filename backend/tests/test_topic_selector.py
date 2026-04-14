from app.services.topic_selector import TopicSelector


def test_topic_selector_returns_topic_for_catalog_role():
    selector = TopicSelector("app/topics/catalog")
    topic = selector.select_topic("Software Engineer", "Intermediate", [])
    assert isinstance(topic, str)
    assert len(topic) > 0


def test_topic_selector_fallbacks_for_unknown_role():
    selector = TopicSelector("app/topics/catalog")
    topic = selector.select_topic("Unknown Role", "Intermediate", [])
    assert topic == "General Fundamentals"
