const fs = require('fs');

const filePath = 'src/pages/GeneratorPage.tsx';

try {
    let text = fs.readFileSync(filePath, 'utf-8');

    // Replace Tone and Funnel with imports
    text = text.replace(
        /type Tone\s*=\s*'Casual' \| 'Sério' \| 'Informativo' \| 'Humor' \| 'Urgente';\r?\ntype Funnel\s*=\s*'Awareness' \| 'Educativo' \| 'Captar Leads' \| 'Vendas' \| 'Engajamento';/g,
        "import type { Tone, Funnel, RssTopic } from '@/components/postgen/GeneratorTypes';\nconst GeneratorWizard = lazy(() => import('@/components/postgen/GeneratorWizard'));\nconst GeneratorSidebar = lazy(() => import('@/components/postgen/GeneratorSidebar'));\nconst GeneratorInspector = lazy(() => import('@/components/postgen/GeneratorInspector'));\nconst GeneratorStage = lazy(() => import('@/components/postgen/GeneratorStage'));"
    );

    // Remove RssTopic interface
    text = text.replace(
        /interface RssTopic \{[\s\S]*?hook_suggestions\?: string\[\];\r?\n\}/g,
        ""
    );

    // Replace the giant render block
    const parts = text.split('if (wizardStep < 4) {');
    if (parts.length < 2) {
        console.error("Couldn't find if (wizardStep < 4) {");
        process.exit(1);
    }

    const renderContent = `if (wizardStep < 4) {
    return (
      <GeneratorWizard
        wizardStep={wizardStep}
        setWizardStep={setWizardStep}
        topic={topic}
        setTopic={setTopic}
        setSelectedSourceUrl={setSelectedSourceUrl}
        isFetchingRss={isFetchingRss}
        handleFetchRss={handleFetchRss}
        showRssPanel={showRssPanel}
        setShowRssPanel={setShowRssPanel}
        rssTopics={rssTopics}
        format={format}
        setFormat={setFormat}
        FORMAT_OPTIONS={FORMAT_OPTIONS}
        slideCount={slideCount}
        setSlideCount={setSlideCount}
        globalImageMethod={globalImageMethod}
        setGlobalImageMethod={setGlobalImageMethod}
        globalTemplate={globalTemplate}
        setGlobalTemplate={setGlobalTemplate}
        clonedDna={clonedDna}
        recommendedTemplateId={recommendedTemplateId}
        selectedCharacterId={selectedCharacterId}
        setSelectedCharacterId={setSelectedCharacterId}
        availableCharacters={availableCharacters}
        selectedCharacter={selectedCharacter}
        preloadedMediaAsset={preloadedMediaAsset}
        handleGenerate={handleGenerate}
        genStep={genStep}
      />
    );
  }

  const activeSlide = slideConfigs[activeSlideIdx];

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => { if (e.target.files) handleUploadBgActiveSlide(e.target.files[0]) }} />
      
      <GeneratorSidebar
        slideConfigs={slideConfigs}
        setSlideConfigs={setSlideConfigs}
        activeSlideIdx={activeSlideIdx}
        setActiveSlideIdx={setActiveSlideIdx}
        width={width}
        height={height}
        createSlideConfig={createSlideConfig}
        renderSlideConfig={renderSlideConfig}
      />

      <GeneratorStage
        postTitle={postTitle}
        activeArcLabel={activeArcLabel}
        selectedCharacter={selectedCharacter}
        width={width}
        height={height}
        activeSlideIdx={activeSlideIdx}
        slideConfigs={slideConfigs}
        setActiveSlideIdx={setActiveSlideIdx}
        format={format}
        setSlideConfigs={setSlideConfigs}
        extractSlideFields={extractSlideFields}
      />

      <GeneratorInspector
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        simlabRun={simlabRun}
        simlabInsight={simlabInsight}
        simlabVariants={simlabVariants}
        simlabLoading={simlabLoading}
        simlabError={simlabError}
        refreshSimlabRun={refreshSimlabRun}
        selectedNode={selectedNode}
        handleStyleUpdate={handleStyleUpdate}
        brand={brand}
        activeSlide={activeSlide}
        activeSlideIdx={activeSlideIdx}
        recommendedTemplateId={recommendedTemplateId}
        selectedCharacter={selectedCharacter}
        availableCharacters={availableCharacters}
        selectedCharacterId={selectedCharacterId}
        setSelectedCharacterId={setSelectedCharacterId}
        VIS_MODES={VIS_MODES}
        updateSlideConfig={updateSlideConfig}
        clonedDna={clonedDna}
        isGenImg={isGenImg}
        handleBgGenForActiveSlide={handleBgGenForActiveSlide}
        fileInputRef={fileInputRef}
        caption={caption}
        setCaption={setCaption}
        hashtags={hashtags}
        removeHashtag={removeHashtag}
        width={width}
        height={height}
        postTitle={postTitle}
        exportSlide={exportSlide}
        exportAllSlides={exportAllSlides}
        exportSlidesPDF={exportSlidesPDF}
        exportSlidesHTML={exportSlidesHTML}
        slideConfigs={slideConfigs}
        isLaunchingRemotion={isLaunchingRemotion}
        handleAnimateWithRemotion={handleAnimateWithRemotion}
        remotionJobId={remotionJobId}
        remotionCompositionId={remotionCompositionId}
        remotionResultUrl={remotionResultUrl}
        remotionStatusPayload={remotionStatusPayload}
        refreshRemotionJob={refreshRemotionJob}
        isSavingLibrary={isSavingLibrary}
        handleSaveToLibrary={handleSaveToLibrary}
        setWizardStep={setWizardStep}
      />
    </div>
  );
};

export default GeneratorPage;
`;

    const newText = parts[0] + renderContent;

    fs.writeFileSync(filePath, newText, 'utf-8');
    console.log("Success");
} catch (error) {
    console.error("Error:", error);
}
